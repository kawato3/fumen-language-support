const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { runTests, downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } = require('@vscode/test-electron');

async function main() {
  const root = path.resolve(__dirname, '..');
  const extensionRoot = process.env.FUMEN_TEST_EXTENSION_PATH || root;
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'fumen-vscode-test-'));
  // Preserve the isolated profile for failure diagnosis; never touch the user's profile.
  console.log(`Isolated test profile: ${temporary}`);
  const userSettings = path.join(temporary, 'user-data', 'User');
  fs.mkdirSync(userSettings, { recursive: true });
  fs.writeFileSync(path.join(userSettings, 'settings.json'), JSON.stringify({ 'update.mode': 'none', 'telemetry.telemetryLevel': 'off' }));
  const launchArgs = [
    '--user-data-dir', path.join(temporary, 'user-data'),
    '--extensions-dir', path.join(temporary, 'extensions'),
    `--locale=${process.env.FUMEN_TEST_LOCALE || 'en'}`,
    // Isolation is provided by the empty extensions directory. Keep the test's
    // language pack enabled rather than disabling every installed extension.
    '--skip-welcome', '--skip-release-notes', '--disable-gpu'
  ];
  const executable = process.env.FUMEN_VSCODE_EXECUTABLE || await downloadAndUnzipVSCode({
    version: process.env.FUMEN_VSCODE_VERSION || 'stable',
    cachePath: path.join(root, 'build', 'cache', 'vscode')
  });
  if (process.env.FUMEN_TEST_LOCALE === 'ja') {
    // A locale flag without a language pack falls back to English. Install Microsoft's
    // pack only in this isolated profile, with no change to the user's installation.
    const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(executable, { reuseMachineInstall: true });
    await new Promise((resolve, reject) => {
      const child = spawn(cli, [...args, ...launchArgs.slice(0, 4), '--install-extension', 'ms-ceintl.vscode-language-pack-ja'],
        { stdio: 'inherit', shell: process.platform === 'win32' });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Language pack installation exited with ${code}`)));
    });
    // CLI installation alone does not initialize a fresh profile's language pack
    // registry. Let VS Code register it, then restart as a user normally would.
    await runTests({
      vscodeExecutablePath: executable,
      extensionDevelopmentPath: extensionRoot,
      extensionTestsPath: path.join(root, 'build/tests/tests/integration/locale-setup.js'),
      extensionTestsEnv: { FUMEN_TEST_LANGUAGE_PACK_CACHE: path.join(temporary, 'user-data', 'languagepacks.json') },
      launchArgs
    });
  }
  if (process.env.FUMEN_TEST_RESTRICTED) {
    // runTests() itself adds --disable-workspace-trust. Use the documented CLI for this pass.
    const workspace = path.join(temporary, 'workspace');
    fs.mkdirSync(workspace);
    fs.copyFileSync(path.join(root, 'docs/examples/basic.fumen'), path.join(workspace, 'basic.fumen'));
    await new Promise((resolve, reject) => {
      const child = spawn(executable, [workspace, ...launchArgs,
        `--extensionDevelopmentPath=${extensionRoot}`,
        `--extensionTestsPath=${path.join(root, 'build/tests/tests/integration/index.js')}`
      ], { stdio: 'inherit', env: process.env });
      child.on('error', reject);
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Restricted-mode tests exited with ${code}`)));
    });
    return;
  }
  await runTests({
    extensionDevelopmentPath: extensionRoot,
    extensionTestsPath: path.join(root, 'build/tests/tests/integration/index.js'),
    vscodeExecutablePath: executable,
    launchArgs
  });
}

main().catch(error => { console.error(error); process.exitCode = 1; });
