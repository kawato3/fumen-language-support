const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const failures = [];
if (!manifest.publisher || manifest.publisher === 'fumen-local') failures.push('publisher を登録済みの発行者 ID に変更してください。');
const repository = typeof manifest.repository === 'string' ? manifest.repository : manifest.repository?.url;
if (!repository || !/^https:\/\//.test(repository)) failures.push('repository に実際の公開リポジトリーの HTTPS URL を設定してください。');
if (!manifest.license || manifest.license === 'UNLICENSED') failures.push('公開用ライセンスを決定し、package.json と LICENSE を更新してください。');
if (!manifest.homepage || !manifest.bugs) failures.push('homepage と bugs に実際の案内先を設定してください。');
if (failures.length) {
  console.error('公開準備が未完了です（ローカルの VSIX 作成・利用は可能です）。\n' + failures.map(message => `- ${message}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log('基本的な公開メタデータが設定されています。docs/PUBLISHING.md に沿って最終確認してください。公開は行っていません。');
}
