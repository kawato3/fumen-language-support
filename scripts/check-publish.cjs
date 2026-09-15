const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const failures = [];
if (!manifest.publisher || manifest.publisher === 'fumen-local') failures.push('Set publisher to the registered Marketplace publisher ID.');
const repository = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url;
if (!repository || !/^https:\/\//.test(repository)) failures.push('Set repository to the public repository HTTPS URL.');
if (!manifest.license || manifest.license === 'UNLICENSED') failures.push('Set a public license and update package.json and LICENSE.');
if (!manifest.homepage || !manifest.bugs) failures.push('Set homepage and bugs to public support locations.');
if (failures.length) {
  console.error('Marketplace metadata is incomplete; local VSIX packaging remains available.\n' + failures.map(message => `- ${message}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Basic Marketplace metadata is configured. This check does not publish the extension.');
}
