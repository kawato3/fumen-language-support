// Verify the locally patched Fumen bundle used by this extension.
const { createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = 'https://raw.githubusercontent.com/hbjpn/fumen/f3d04a522c19236c81f553871d6aee665d9eda22/';
const assets = [
  ['fumen.js', null, '453f0b4ca6a9354619b1e289cdf5e2a1860a9bfb611c899b3a2b0807de4c88fa'],
  ['FUMEN-LICENSE.txt', base + 'LICENSE.txt', 'c929baf8c1319dc5c7a2febbbc63abcff243ebdc0d2e1fedf989ff33b7181849'],
  ['OFL.txt', base + 'OFL.txt', '632bb8c8c187ad3385504addd36705148b29de24f67b3bdafb7efb11687eb7fc'],
  ['BABEL-LICENSE.txt', 'https://unpkg.com/@babel/polyfill@7.8.7/LICENSE', '117da2af0d4ce0fe1c8e19b5cff9dcd806adf973d328d27b11d4448c4ff24f76'],
  ['CORE-JS-LICENSE.txt', 'https://unpkg.com/core-js@2.6.11/LICENSE', '722e1193901ad1ed4460753dded483d68ca2ad0528c67f86f76abc46b9aa25f5'],
  ['REGENERATOR-LICENSE.txt', 'https://unpkg.com/regenerator-runtime@0.13.11/LICENSE', '51887a3d47051ac2fce1210562e5b9fe0830a8a8fabeb272c2d586eeb18a05fd'],
  ['WEBPACK-LICENSE.txt', 'https://raw.githubusercontent.com/webpack/webpack/v5.78.0/LICENSE', '9068a8782d2fb4c6e432cfa25334efa56f722822180570802bf86e71b6003b1e']
];

async function main() {
  const directory = path.resolve(__dirname, '../resources/vendor');
  const pending = [];
  for (const [name, url, checksum] of assets) {
    const target = path.join(directory, name);
    let bytes;
    try { bytes = await fs.readFile(target); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (process.argv.includes('--check')) throw new Error(`${name} is missing. Run npm run vendor:fumen.`);
      if (!url) throw new Error(`${name} is a local preview patch and cannot be downloaded automatically.`);
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`Download failed: ${url} (${response.status})`);
      bytes = Buffer.from(await response.arrayBuffer());
      pending.push([target, bytes]);
    }
    if (createHash('sha256').update(bytes).digest('hex') !== checksum) throw new Error(`SHA-256 mismatch: ${name}. No files have been changed.`);
  }
  if (pending.length) {
    await fs.mkdir(directory, { recursive: true });
    for (const [target, bytes] of pending) await fs.writeFile(target, bytes, { flag: 'wx' });
  }
  console.log(`Local Fumen 1.3.3 chord-component patch and third-party license hashes verified (${assets.length} files).`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
