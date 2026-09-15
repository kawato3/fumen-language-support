const fs = require('node:fs/promises');
const path = require('node:path');
const { createVSIX } = require('@vscode/vsce');

async function main() {
  const root = path.resolve(__dirname, '..');
  const directory = path.join(root, 'artifacts', 'vsix');
  await fs.mkdir(directory, { recursive: true });
  // An existing directory lets vsce choose the filename from the manifest version.
  await createVSIX({ cwd: root, packagePath: directory, dependencies: false });
}

main().catch(error => { console.error(error); process.exitCode = 1; });
