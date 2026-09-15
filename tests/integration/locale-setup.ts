import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

/** VS Code registers CLI-installed language packs on its first GUI startup. */
export async function run(): Promise<void> {
  const cache = process.env.FUMEN_TEST_LANGUAGE_PACK_CACHE;
  assert.ok(cache, 'Isolated language pack cache path is provided');
  const until = Date.now() + 20_000;
  while (Date.now() < until) {
    if (existsSync(cache)) {
      const packs = JSON.parse(readFileSync(cache, 'utf8'));
      if (packs.ja?.translations?.vscode && existsSync(packs.ja.translations.vscode)) {
        console.log('Japanese language pack registered; restarting before locale assertions.');
        return;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.fail('VS Code did not register the Japanese language pack in the isolated profile');
}
