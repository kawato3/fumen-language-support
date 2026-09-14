import { randomBytes } from 'node:crypto';
import { constants } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { homedir } from 'node:os';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

/** Desktop VS Code's user-data provider maps the same path onto its local disk provider. */
export function isLocalPrintStorage(uri: { scheme: string; authority: string; fsPath: string }): boolean {
  return (uri.scheme === 'file' || (uri.scheme === 'vscode-userdata' && uri.authority === ''))
    && path.isAbsolute(uri.fsPath);
}

export function chromeCandidates(platform = process.platform, home = homedir(), env = process.env): string[] {
  if (platform === 'darwin') return ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    path.join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome')];
  if (platform === 'win32') return [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA]
    .filter((directory): directory is string => Boolean(directory))
    .map(directory => path.win32.join(directory, 'Google', 'Chrome', 'Application', 'chrome.exe'));
  if (platform === 'linux') return ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome'];
  return [];
}

export async function findChrome(configured = ''): Promise<string | undefined> {
  if (configured && !path.isAbsolute(configured)) return undefined;
  for (const candidate of configured ? [configured] : chromeCandidates()) {
    try {
      if (!(await fs.stat(candidate)).isFile()) continue;
      await fs.access(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK);
      return candidate;
    } catch { /* Try the next known installation; never search an untrusted workspace/PATH. */ }
  }
  return undefined;
}

export function launchChrome(executable: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // No shell, command-line setting, workspace executable search or interpolated score text.
    const child = spawn(executable, [pathToFileURL(filename).href], { shell: false, detached: true, stdio: 'ignore' });
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}

const FILE_PATTERN = /^print-[a-f0-9]{36}\.html$/;
const MAXIMUM_AGE = 24 * 60 * 60 * 1000;

/** Private local snapshots, not exports into the user's workspace. */
export class PrintFiles {
  private readonly owned = new Set<string>();
  constructor(private readonly directory: string) {}

  async prepare(now = Date.now()): Promise<void> {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    const info = await fs.lstat(this.directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Invalid print storage directory');
    await fs.chmod(this.directory, 0o700);
    for (const entry of await fs.readdir(this.directory, { withFileTypes: true })) {
      if (!entry.isFile() || !FILE_PATTERN.test(entry.name)) continue;
      const filename = path.join(this.directory, entry.name);
      try {
        if (now - (await fs.stat(filename)).mtimeMs >= MAXIMUM_AGE) await fs.unlink(filename);
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
  }

  async create(html: string): Promise<string> {
    await this.prepare();
    const filename = path.join(this.directory, `print-${randomBytes(18).toString('hex')}.html`);
    await fs.writeFile(filename, html, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    this.owned.add(filename);
    return filename;
  }

  async remove(filename: string): Promise<void> {
    if (!this.owned.has(filename)) return;
    await fs.unlink(filename).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
    this.owned.delete(filename);
  }

  async dispose(): Promise<void> { await Promise.all([...this.owned].map(filename => this.remove(filename))); }
}
