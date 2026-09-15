import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import * as ts from 'typescript';
import { DURATIONS, SETTINGS, SIGNS, TEMPLATES } from '../../src/catalog';
import { NOTATION_INSERT_GROUPS } from '../../src/notation-inserts';
import { complete, diagnose, hover } from '../../src/language';
import { createTranslator, helpFile, TranslationBundle } from '../../src/localization';
import { previewHtml } from '../../src/preview-html';
import { CanvasBudget, checkLayout } from '../../src/webview/layout-safety';

const bundle: TranslationBundle = JSON.parse(readFileSync('l10n/bundle.l10n.ja.json', 'utf8'));
const ja = createTranslator(bundle);
const en = createTranslator();

test('Japanese display language selects Japanese help; every other language falls back to English', () => {
  for (const name of ['CHEATSHEET', 'QUICKSTART'] as const) {
    for (const language of ['ja', 'ja-JP', 'JA']) assert.equal(helpFile(name, language), `${name}.ja.md`);
    for (const language of ['en', 'en-US', 'de', 'fr', 'zh-cn', '', 'javascript']) assert.equal(helpFile(name, language), `${name}.md`);
    for (const suffix of ['', '.ja']) {
      const source = readFileSync(`docs/${name}${suffix}.md`, 'utf8');
      const target = `${name}${suffix ? '' : '.ja'}.md`;
      assert.ok(source.split('\n').slice(0, 5).join('\n').includes(`](${target})`), 'Language link is at the top');
      assert.ok(existsSync(`docs/${target}`));
    }
  }
});

test('manifest localization is complete in English and Japanese and included in distribution', () => {
  const manifest = readFileSync('package.json', 'utf8');
  const defaults = JSON.parse(readFileSync('package.nls.json', 'utf8'));
  const japanese = JSON.parse(readFileSync('package.nls.ja.json', 'utf8'));
  const keys = [...manifest.matchAll(/"%([\w.]+)%"/g)].map(match => match[1]!);
  assert.ok(keys.length > 0, 'The manifest declares localizable strings');
  assert.deepEqual(Object.keys(defaults).sort(), [...keys].sort());
  assert.deepEqual(Object.keys(japanese).sort(), [...keys].sort());
  for (const key of keys) {
    assert.ok(defaults[key] && japanese[key], key);
    assert.doesNotMatch(defaults[key], /[ぁ-んァ-ヶ一-龠]/, 'English default');
  }
  assert.equal(JSON.parse(manifest).l10n, './l10n');
  const packaging = readFileSync('.vscodeignore', 'utf8');
  for (const file of ['package.nls*.json', 'l10n/*.json', 'docs/CHEATSHEET.md', 'docs/CHEATSHEET.ja.md', 'docs/QUICKSTART.md', 'docs/QUICKSTART.ja.md']) {
    assert.ok(packaging.includes(`!${file}`), file);
  }
});

test('translation placeholders and catalog descriptions stay complete', () => {
  const placeholders = (value: string) => [...value.matchAll(/\{\d+\}/g)].map(match => match[0]).sort();
  for (const [key, value] of Object.entries(bundle)) {
    assert.equal(typeof value, 'string');
    assert.deepEqual(placeholders(key), placeholders(value as string), key);
    assert.doesNotMatch(key, /[ぁ-んァ-ヶ一-龠]/);
  }
  const messages = [...SETTINGS.map(item => item.description), ...SIGNS.map(item => item.description),
    ...DURATIONS.map(item => item[1]), ...TEMPLATES.flatMap(item => [item.label, item.description]),
    ...NOTATION_INSERT_GROUPS.flatMap(group => [group.label, ...group.items.map(item => item.label)])];
  for (const message of messages) assert.ok(bundle[message], message);
  // Check literal t(...) messages without requiring the VS Code runtime.
  for (const directory of ['src', 'src/webview']) {
    for (const filename of readdirSync(directory).filter(file => file.endsWith('.ts'))) {
      const text = readFileSync(`${directory}/${filename}`, 'utf8');
      const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);
      function visit(node: ts.Node): void {
        if (ts.isCallExpression(node) && (node.expression.getText(source) === 't' || node.expression.getText(source) === 'vscode.l10n.t')) {
          const argument = node.arguments[0];
          if (argument && ts.isStringLiteral(argument)) assert.ok(bundle[argument.text], argument.text);
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
});

test('translations preserve arguments, fallback messages and notation behavior', () => {
  assert.equal(ja('Missing closing {0}.', ']'), '閉じる ] が見つかりません。');
  assert.equal(en('Missing closing {0}.', ']'), 'Missing closing ].');
  assert.equal(ja('Unknown {0}', 'message'), 'Unknown message');
  assert.equal(ja('Unknown {0}', '{1}'), 'Unknown {1}', 'Arguments are not translated or recursively expanded');
  assert.equal(ja('toString'), 'toString', 'Inherited dictionary properties are ignored');
  assert.equal(createTranslator({ message: { message: 'Translated {0}' } })('message', 3), 'Translated 3');
  const text = '%TITLE=123\n[A';
  assert.deepEqual(diagnose(text, ja).map(({ message: _, ...issue }) => issue), diagnose(text).map(({ message: _, ...issue }) => issue));
  assert.match(diagnose(text, ja)[0]!.message, /閉じる/);
  assert.equal(ja(complete('%TI', 3)[0]!.detail), '曲名。ダブルクオートで囲みます。');
  assert.equal(ja(hover('[A]', 1)!.title), '構成記号');
  assert.equal(ja('Open Fumen Cheat Sheet'), 'チートシートを開く');
  assert.equal(hover('| Cm7-5 |', 4), undefined);
  assert.throws(() => checkLayout({ name: 'PARAM', value: { paper_width: 1e9 } }, ja), /範囲外/);
  assert.throws(() => new CanvasBudget(1, ja).resize({}, 2, 2), /合計が大きすぎ/);
});

test('preview localizes controls and safely transfers translation data without inline scripts', () => {
  const resources = { script: 'main.js', library: 'fumen.js', style: 'preview.css', cspSource: 'https://local.test', nonce: 'test' };
  const english = previewHtml(resources);
  assert.ok(english.includes('<html lang="en">') && english.includes('Fit to Width'));
  const japanese = previewHtml(resources, ja, 'ja', bundle);
  assert.ok(japanese.includes('<html lang="ja">') && japanese.includes('幅に合わせる'));
  const attribute = /data-l10n="([^"]*)"/.exec(japanese)![1]!;
  const decoded = attribute.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  assert.deepEqual(JSON.parse(decoded), bundle, 'The browser receives the exact translated messages');
  const unsafe = { 'Fit to Width': '"></button><script>alert(1)</script>' };
  const html = previewHtml(resources, createTranslator(unsafe), 'en', unsafe);
  assert.equal([...html.matchAll(/<script\b/g)].length, 2, 'Only the two external asset scripts');
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!html.includes('unsafe-inline') && !html.includes('unsafe-eval'));
});
