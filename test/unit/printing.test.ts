import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { printHtml } from '../../src/print-html';
import { chromeCandidates, findChrome, isLocalPrintStorage, PrintFiles } from '../../src/print-platform';
import { RecordingBudget } from '../../src/webview/canvas-recording';

const assets = { library: '/* vendor */', script: '/* application */', style: 'body{}', notices: 'Copyright & license', nonce: 'test-nonce' };

test('local print storage accepts desktop user-data URIs without admitting arbitrary providers', () => {
  const local = { authority: '', fsPath: join(tmpdir(), 'print-storage') };
  assert.equal(isLocalPrintStorage({ ...local, scheme: 'file' }), true);
  assert.equal(isLocalPrintStorage({ ...local, scheme: 'vscode-userdata' }), true);
  for (const scheme of ['vscode-remote', 'memfs', 'https', '']) {
    assert.equal(isLocalPrintStorage({ ...local, scheme }), false, scheme);
  }
  assert.equal(isLocalPrintStorage({ ...local, scheme: 'vscode-userdata', authority: 'remote-host' }), false);
  for (const scheme of ['file', 'vscode-userdata']) {
    assert.equal(isLocalPrintStorage({ ...local, scheme, fsPath: 'relative/path' }), false);
  }
});

test('print HTML isolates score and translations from scripts and keeps assets offline', () => {
  const text = '%TITLE="</script><script>globalThis.injection=1</script>"\n[A]\n| C |';
  const html = printHtml({ text, name: '<img src=x>.fumen' }, assets, undefined, 'ja', { hostile: '</script>' });
  assert.equal((html.match(/<script\b/g) || []).length, 3);
  assert.ok(!html.includes('<script>globalThis.injection'));
  assert.ok(html.includes('&lt;img src=x&gt;.fumen'));
  const json = /<script id="input"[^>]*>(.*?)<\/script>/s.exec(html)![1]!;
  assert.deepEqual(JSON.parse(json), { text, name: '<img src=x>.fumen', bundle: { hostile: '</script>' } });
  assert.ok(html.includes("default-src 'none'") && html.includes("base-uri 'none'") && html.includes('img-src data:'));
  assert.ok(!html.includes('unsafe-inline') && !html.includes('unsafe-eval'));
  assert.ok(html.includes('<html lang="ja">') && html.includes('Copyright &amp; license'));
  const scripts = [...html.matchAll(/src="data:text\/javascript;base64,([^"]+)"/g)];
  assert.deepEqual(scripts.map(match => Buffer.from(match[1]!, 'base64').toString('utf8')), [assets.library, assets.script]);
  assert.throws(() => printHtml({ text: 'x'.repeat(100_001), name: 'large' }, assets), /100,000/);
});

test('recording limits bound both command count and retained text, including cumulative reset work', () => {
  const count = new RecordingBudget(undefined, 2, 100);
  count.reserve([]); count.reserve([]);
  assert.throws(() => count.reserve([]), /too complex/);
  const text = new RecordingBudget(undefined, 100, 5);
  text.reserve(['日本語', 10]); text.reserve(['ab']);
  assert.throws(() => text.reserve(['c']), /too complex/);
});

test('Chrome discovery uses known platform paths and honors an explicit executable only', async () => {
  assert.deepEqual(chromeCandidates('win32', 'unused', { PROGRAMFILES: 'C:\\Program Files' }),
    ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']);
  assert.equal(chromeCandidates('darwin', '/Users/example')[1], '/Users/example/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  assert.equal(await findChrome('relative/chrome'), undefined);
  assert.equal(await findChrome('/definitely-missing-fumen-chrome'), undefined);
  assert.equal(await findChrome(tmpdir()), undefined, 'A directory is not an executable');
});

test('private print snapshots preserve source, do not overwrite, and clean up only their own files', async t => {
  const root = await fs.mkdtemp(join(tmpdir(), 'fumen-print-files-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const directory = join(root, 'print');
  const files = new PrintFiles(directory);
  const first = await files.create('first'), second = await files.create('second');
  assert.notEqual(first, second);
  assert.equal(await fs.readFile(first, 'utf8'), 'first');
  if (process.platform !== 'win32') {
    assert.equal((await fs.stat(directory)).mode & 0o777, 0o700);
    assert.equal((await fs.stat(first)).mode & 0o777, 0o600);
  }
  const unrelated = join(directory, 'keep.html');
  await fs.writeFile(unrelated, 'unrelated');
  await files.remove(unrelated);
  assert.equal(await fs.readFile(unrelated, 'utf8'), 'unrelated');
  await files.dispose();
  await assert.rejects(fs.stat(first), { code: 'ENOENT' });
  await assert.rejects(fs.stat(second), { code: 'ENOENT' });
  assert.equal(await fs.readFile(unrelated, 'utf8'), 'unrelated');
});

test('crash cleanup expires only matching regular snapshot files; links and recent files survive', async t => {
  const root = await fs.mkdtemp(join(tmpdir(), 'fumen-print-expiry-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const store = new PrintFiles(root);
  const stale = await store.create('expired'), recent = await store.create('recent');
  await fs.utimes(stale, 1, 1);
  const unrelated = join(root, 'notes.html');
  await fs.writeFile(unrelated, 'keep'); await fs.utimes(unrelated, 1, 1);
  const link = join(root, `print-${'a'.repeat(36)}.html`);
  if (process.platform !== 'win32') await fs.symlink(unrelated, link);
  await new PrintFiles(root).prepare();
  await assert.rejects(fs.stat(stale), { code: 'ENOENT' });
  assert.equal(await fs.readFile(recent, 'utf8'), 'recent');
  assert.equal(await fs.readFile(unrelated, 'utf8'), 'keep');
  if (process.platform !== 'win32') assert.ok((await fs.lstat(link)).isSymbolicLink());
});

test('print command is discoverable, with a machine-only path and no stolen print shortcut', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.ok(manifest.contributes.commands.some((entry: { command: string }) => entry.command === 'fumen.openPrint'));
  assert.equal(manifest.contributes.configuration.properties['fumen.print.chromePath'].scope, 'machine');
  assert.ok(!manifest.contributes.keybindings.some((entry: { command: string }) => entry.command === 'fumen.openPrint'));
  assert.ok(readFileSync('.vscodeignore', 'utf8').includes('!media/print.css'));
});
