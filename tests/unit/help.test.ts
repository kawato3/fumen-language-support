import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
    const renderingReference = source.indexOf('https://hbjpn.github.io/fumen/api_reference/#renderparam');
    assert.ok(renderingReference >= 0 && renderingReference < source.indexOf('<a id="extension-chord-display">'),
      'The upstream rendering reference is separate from the extension-specific parameters');
    for (const field of ['minor_label', 'major_label', 'diminished_label', 'half_diminished_label', 'augmented_label', 'chord_suffix_style']) {
      const row = source.split('\n').find(line => line.startsWith(`| \`${field}\` |`));
      assert.ok(row?.includes(locale === 'ja' ? '**既定:' : '**Default:'), `Documented default: ${field}`);
    }
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
  assert.equal(JSON.parse(readFileSync('package.nls.ja.json', 'utf8'))['command.insertNotation'], 'Fumen 記法の挿入…');
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
  assert.ok(readFileSync('.vscodeignore', 'utf8').includes('!resources/images/chord-display-modes.png'));
});

test('main documentation identifies the renderer addition as extension-specific', () => {
  const english = readFileSync('README.md', 'utf8');
  const japanese = readFileSync('docs/README.ja.md', 'utf8');
  for (const source of [english, japanese]) {
    for (const field of ['minor_label', 'major_label', 'diminished_label', 'half_diminished_label', 'augmented_label', 'chord_suffix_style']) assert.ok(source.includes(field), field);
  }
  assert.ok(english.includes('extension-specific'));
  assert.ok(japanese.includes('独自'));
  assert.ok(english.includes('[CHANGELOG.md](CHANGELOG.md)'));
  assert.ok(japanese.includes('[CHANGELOG.md](../CHANGELOG.md)'));
  assert.doesNotMatch(english, /^### 1\.0\./m);
  assert.doesNotMatch(japanese, /^### 1\.0\./m);
  assert.ok(!english.includes('Development and distribution'));
  assert.ok(!japanese.includes('開発・パッケージ作成'));
  assert.ok(!english.includes('npm run '));
  assert.ok(!japanese.includes('npm run '));
  assert.ok(english.includes('resources/images/chord-display-modes.png'));
  assert.ok(japanese.includes('resources/images/chord-display-modes.png'));
  assert.ok(readFileSync('resources/images/chord-display-modes.png').length > 1_000, 'A rendered comparison image is included');
});

test('release metadata matches the latest changelog version', () => {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const changelog = readFileSync('CHANGELOG.md', 'utf8');

  const latestVersion = /^## (\d+\.\d+\.\d+)$/m.exec(changelog)?.[1];
  assert.equal(latestVersion, manifest.version);
  assert.equal(lock.version, manifest.version);
  assert.equal(lock.packages[''].version, manifest.version);
});

test('notation picker is documented as a native, non-musical insertion aid', () => {
  const english = [readFileSync('README.md', 'utf8'), readFileSync('docs/QUICKSTART.md', 'utf8')].join('\n');
  const japanese = [readFileSync('docs/README.ja.md', 'utf8'), readFileSync('docs/QUICKSTART.ja.md', 'utf8')].join('\n');
  assert.ok(english.includes('Fumen: Insert Notation…'));
  assert.ok(english.includes('@command:fumen.insertNotation'));
  assert.ok(english.includes('does not suggest chord names'));
  assert.ok(japanese.includes('Fumen 記法の挿入…'));
  assert.ok(japanese.includes('@command:fumen.insertNotation'));
  assert.ok(japanese.includes('コード名、コード進行、音楽的な内容は提案しません。'));
});

test('the reusable Fumen patch is documented, version-pinned and excluded from the VSIX', () => {
  const directory = 'patches/fumen-1.3.3-chord-component-display';
  const english = readFileSync(`${directory}/README.md`, 'utf8');
  const japanese = readFileSync(`${directory}/README.ja.md`, 'utf8');
  const patch = readFileSync(`${directory}/0001-fumen-1.3.3-chord-component-display-1.0.5.patch`, 'utf8');
  const example = readFileSync(`${directory}/examples/chord-component-display.fumen`, 'utf8');
  for (const source of [english, japanese]) {
    assert.ok(source.includes('f3d04a522c19236c81f553871d6aee665d9eda22'));
    for (const field of ['minor_label', 'major_label', 'diminished_label', 'half_diminished_label', 'augmented_label', 'chord_suffix_style']) assert.ok(source.includes(field), field);
  }
  assert.ok(patch.startsWith('diff --git '), 'A cumulative diff applicable with git apply');
  assert.ok(!patch.includes('diff --git a/src/parser/'), 'Display settings must not extend the parser');
  assert.ok(patch.includes('src/renderer/default_renderer.js'));
  assert.doesNotMatch(patch, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    'The reusable patch must not contain email addresses');
  const checksum = createHash('sha256').update(patch).digest('hex');
  assert.ok(english.includes(checksum));
  assert.ok(japanese.includes(checksum));
  assert.ok(example.includes('"chord_suffix_style":"inline"'));
  assert.ok(!readFileSync('.vscodeignore', 'utf8').includes('!patches/'), 'The developer patch stays out of the VSIX');
});

test('the reusable patch distributes the exact renderer bundled with the extension', () => {
  const patch = readFileSync('patches/fumen-1.3.3-chord-component-display/0001-fumen-1.3.3-chord-component-display-1.0.5.patch', 'utf8');
  const target = /^diff --git a\/dist\/fumen\.js b\/dist\/fumen\.js\nindex [a-f0-9]{40}\.\.([a-f0-9]{40}) 100644$/m.exec(patch);
  assert.ok(target, 'Generate the patch with git diff --full-index so its bundle identity is verifiable');
  const bundle = readFileSync('resources/vendor/fumen.js');
  const blobId = createHash('sha1').update(`blob ${bundle.length}\0`).update(bundle).digest('hex');
  assert.equal(target[1], blobId, 'The standalone patch and extension must render with the same library');
});

test('the published 1.0.3 patch is retained byte-for-byte under its versioned name', () => {
  const bytes = readFileSync('patches/fumen-1.3.3-chord-component-display/0001-fumen-1.3.3-chord-component-display-1.0.3.patch');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    '70cc019dfb1dd2921fe897d2ace21ecf1af75cd8f84b3a0ac2855ffe1f285032');
});

test('bar numbers are documented as an opt-in, bounded, extension-specific feature', () => {
  for (const suffix of ['', '.ja']) {
    const sheet = readFileSync(`docs/CHEATSHEET${suffix}.md`, 'utf8');
    assert.ok(sheet.includes('"bar_number":"on"'));
    assert.ok(sheet.includes('"bar_start":0'));
    assert.match(sheet, /\*\*`bar_start`[^\n]*`1`/);
    assert.ok(sheet.includes('"off"'));
    assert.ok(sheet.includes('xX') && sheet.includes('10,000'));
    assert.equal((sheet.match(/id="extension-bar-numbers"/g) || []).length, 1);
  }
});
