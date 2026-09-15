import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SETTINGS, SIGNS } from '../../src/catalog';

interface Token { type: string; content: string; info: string; children?: Token[] }
// Same Markdown engine family as VS Code. Kept as a direct development dependency only.
const markdown = new (require('markdown-it'))({ html: true }) as {
  parse(source: string, environment: object): Token[];
  render(source: string): string;
};
for (const locale of ['en', 'ja']) {
  const suffix = locale === 'ja' ? '.ja' : '';
  const source = readFileSync(`docs/CHEATSHEET${suffix}.md`, 'utf8');
  const tokens = markdown.parse(source, {});

  test(`${locale} cheat sheet tables keep literal bars, angle brackets and backticks intact`, () => {
    const inlineCode = tokens.flatMap(token => token.children ?? [])
      .filter(token => token.type === 'code_inline').map(token => token.content);
    for (const value of ['|', '||', '||.', '||:', ':||', ':||x3', ':||xX', ':||:', './|/.', locale === 'ja' ? '`歌詞`@ C7' : '`lyrics`@ C7', ...SIGNS.map(sign => sign.value)]) {
      assert.ok(inlineCode.includes(value), `Readable/copyable notation: ${value}`);
    }
    let cells = 0;
    for (const token of tokens) {
      if (token.type === 'tr_open') cells = 0;
      if (token.type === 'td_open' || token.type === 'th_open') ++cells;
      if (token.type === 'tr_close') assert.equal(cells, 2, 'Pipes must not split table cells');
    }
    const html = markdown.render(source);
    assert.ok(html.includes('<code>&lt;D.C. al Coda&gt;</code>'));
    assert.ok(!html.includes('<script') && !html.includes('<iframe') && !html.includes('<img'));
  });

  test(`${locale} cheat sheet covers settings, offline examples, language links and attribution`, () => {
    for (const setting of SETTINGS) assert.ok(source.includes(`%${setting.name}=`), setting.name);
    const examples = tokens.filter(token => token.type === 'fence' && token.info === 'fumen');
    assert.ok(examples.length > 0, 'The cheat sheet includes copyable examples');
    for (const example of examples) assert.ok(example.content.includes('|'));
    assert.ok(source.includes('Fumen 1.3.3'));
    assert.ok(source.includes('Copyright (c) 2020 Hiroyuki Baba'));
    assert.ok(source.includes('https://hbjpn.github.io/fumen/cheatsheet/'));
    for (const field of ['minor_label', 'major_label', 'chord_suffix_style']) assert.ok(source.includes(field), field);
    assert.ok(source.includes('U+2013'));
    assert.ok(source.includes('U+0394'));
    assert.ok(source.includes('extension-chord-display'));
    assert.ok(source.includes(locale === 'ja' ? '**既定:' : '**Default:'), 'Each extension-specific parameter states its default');
    assert.ok(source.includes(`(QUICKSTART${suffix}.md)`));
    assert.ok(source.split('\n').slice(0, 5).join('\n').includes(locale === 'ja' ? '[English](CHEATSHEET.md)' : '[日本語](CHEATSHEET.ja.md)'));
    // Explicit anchors avoid VS Code version differences in Japanese heading slugs.
    const targets = [...source.matchAll(/\]\(#([^)]*)\)/g)].map(match => match[1]);
    assert.ok(targets.length > 0, 'The cheat sheet includes a table of contents');
    const html = markdown.render(source);
    for (const target of targets) assert.ok(html.includes(`<a id="${target}"></a>`), target);
  });
}

test('Fumen actions are discoverable, with only one extension-owned default shortcut', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  const notation = manifest.contributes.commands.find((item: { command: string }) => item.command === 'fumen.insertNotation');
  assert.equal(notation.title, '%command.insertNotation%');
  assert.equal(JSON.parse(readFileSync('package.nls.json', 'utf8'))['command.insertNotation'], 'Insert Notation…');
  assert.equal(JSON.parse(readFileSync('package.nls.ja.json', 'utf8'))['command.insertNotation'], '記法を挿入…');
  assert.equal(notation.enablement, 'editorLangId == fumen');
  const help = manifest.contributes.commands.find((item: { command: string }) => item.command === 'fumen.openCheatSheet');
  assert.equal(help.title, '%command.openCheatSheet%');
  assert.equal(JSON.parse(readFileSync('package.nls.json', 'utf8'))['command.openCheatSheet'], 'Open Cheat Sheet');
  assert.equal(JSON.parse(readFileSync('package.nls.ja.json', 'utf8'))['command.openCheatSheet'], 'チートシートを開く');
  assert.equal(help.icon, '$(book)');
  assert.equal(help.enablement, undefined, 'Help can open without an active Fumen editor');
  assert.ok(manifest.contributes.menus['editor/title'].some((item: { command: string; when: string }) =>
    item.command === help.command && item.when === 'resourceLangId == fumen'));
  assert.deepEqual(manifest.contributes.menus['editor/context'].map((item: { command: string; when: string }) =>
    ({ command: item.command, when: item.when })), [
    { command: 'fumen.insertNotation', when: 'resourceLangId == fumen' },
    { command: 'fumen.openPreview', when: 'resourceLangId == fumen' },
    { command: 'fumen.openCheatSheet', when: 'resourceLangId == fumen' },
    { command: 'fumen.openPrint', when: 'resourceLangId == fumen' }
  ], 'Fumen-only actions; Format Document is supplied by VS Code, not duplicated');
  assert.deepEqual(manifest.contributes.keybindings, [{
    command: 'fumen.openPreview', key: 'ctrl+k v', mac: 'cmd+k v',
    when: 'editorTextFocus && editorLangId == fumen && !notebookEditorFocused'
  }]);
  assert.ok(readFileSync('.vscodeignore', 'utf8').includes('!docs/CHEATSHEET.md'));
  assert.ok(readFileSync('.vscodeignore', 'utf8').includes('!media/screenshots/chord-display-modes.png'));
});

test('main documentation identifies the renderer addition as extension-specific', () => {
  const english = readFileSync('README.md', 'utf8');
  const japanese = readFileSync('README.ja.md', 'utf8');
  for (const source of [english, japanese]) {
    for (const field of ['minor_label', 'major_label', 'chord_suffix_style']) assert.ok(source.includes(field), field);
  }
  assert.ok(english.includes('extension-specific'));
  assert.ok(japanese.includes('独自'));
  assert.ok(english.includes('### 1.0.2') && english.includes('### 1.0.1'));
  assert.ok(japanese.includes('### 1.0.2') && japanese.includes('### 1.0.1'));
  assert.ok(english.includes('media/screenshots/chord-display-modes.png'));
  assert.ok(japanese.includes('media/screenshots/chord-display-modes.png'));
  assert.ok(readFileSync('media/screenshots/chord-display-modes.png').length > 1_000, 'A rendered comparison image is included');
});

test('notation picker is documented as a native, non-musical insertion aid', () => {
  const english = [readFileSync('README.md', 'utf8'), readFileSync('docs/QUICKSTART.md', 'utf8')].join('\n');
  const japanese = [readFileSync('README.ja.md', 'utf8'), readFileSync('docs/QUICKSTART.ja.md', 'utf8')].join('\n');
  assert.ok(english.includes('Fumen: Insert Notation…'));
  assert.ok(english.includes('@command:fumen.insertNotation'));
  assert.ok(english.includes('does not suggest chord names'));
  assert.ok(japanese.includes('Fumen: 記法を挿入…'));
  assert.ok(japanese.includes('@command:fumen.insertNotation'));
  assert.ok(japanese.includes('コード名、コード進行、音楽的な内容は提案しません。'));
});

test('the reusable Fumen patch is documented, version-pinned and excluded from the VSIX', () => {
  const directory = 'patches/fumen-1.3.3-chord-component-display';
  const english = readFileSync(`${directory}/README.md`, 'utf8');
  const japanese = readFileSync(`${directory}/README.ja.md`, 'utf8');
  const patch = readFileSync(`${directory}/0001-fumen-1.3.3-chord-component-display.patch`, 'utf8');
  const example = readFileSync(`${directory}/examples/chord-component-display.fumen`, 'utf8');
  for (const source of [english, japanese]) {
    assert.ok(source.includes('f3d04a522c19236c81f553871d6aee665d9eda22'));
    for (const field of ['minor_label', 'major_label', 'chord_suffix_style']) assert.ok(source.includes(field), field);
  }
  assert.ok(patch.startsWith('From e0d08758ee51f967f7b8d07852a264f96bd5ae28 '));
  assert.ok(patch.includes('src/renderer/default_renderer.js'));
  assert.ok(example.includes('"chord_suffix_style":"inline"'));
  assert.ok(!readFileSync('.vscodeignore', 'utf8').includes('!patches/'), 'The developer patch stays out of the VSIX');
});

test('the publishing guide preserves the Marketplace reminder for the reusable patch', () => {
  const guide = readFileSync('docs/PUBLISHING.md', 'utf8');
  assert.ok(guide.includes('現在の公開版は **1.0.2**'));
  assert.ok(guide.includes('Use the renderer patch outside VS Code'));
  assert.ok(guide.includes('fumen-1.3.3-chord-component-display'));
  assert.ok(guide.includes('VSIX には含めません'));
  assert.ok(guide.includes('変更履歴に版を追加する必要はありません'));
});
