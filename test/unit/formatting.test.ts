import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { formattingEdits } from '../../src/formatting';

function formatted(source: string): string {
  const edits = formattingEdits(source);
  let end = source.length;
  let result = source;
  for (const edit of [...edits].reverse()) {
    assert.ok(edit.start >= 0 && edit.start <= edit.end && edit.end <= end, 'Ordered, non-overlapping UTF-16 offsets');
    assert.match(source.slice(edit.start, edit.end), /^[ \t\r\n]*$/, 'Only whitespace is replaced');
    assert.match(edit.text, /^ ?$/, 'Only a single space or deletion is inserted');
    assert.notEqual(source.slice(edit.start, edit.end), edit.text, 'No redundant edits');
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
    end = edit.start;
  }
  return result;
}

const examples: [string, string, string][] = [
  ['bar spacing and ordinary gaps', '|Cmaj7   Dm7|\tG7||.  ', '| Cmaj7 Dm7 | G7 ||.'],
  ['all boundary spellings', '||:C|D||E :||x3\n|F :||xX\n|G :||:Am ./|/.B||.', '||: C | D || E :||x3\n| F :||xX\n| G :||: Am ./|/. B ||.'],
  ['spaced repeat endings', '| C   :||x3\n| D :||xX\n| E :||: F |', '| C :||x3\n| D :||xX\n| E :||: F |'],
  ['empty measures stay separate', '|  |   ||.\n|||', '| | ||.\n|| |'],
  ['quoted text, lyrics and labels', '[ Verse  A ]\n|"C  |  D"  \'say  it\'  `la  la`@  C| [1,  2] D |', '[ Verse  A ]\n| "C  |  D" \'say  it\' `la  la`@ C | [1,  2] D |'],
  ['multiline strings and non-JSON backslashes', '| "one  \n  two"  \'path\\\'   C |', '| "one  \n  two" \'path\\\' C |'],
  ['indentation, blank lines and line continuations', '  [A]\r\n\t|C|  \\  \r\n  |D|\r\n \t\r\n>|E|\r< |F|', '  [A]\r\n\t| C | \\\r\n  | D |\r\n\r\n> | E |\r< | F |'],
  ['musical spacing and chord spelling', '| C7(b9,#11):4.   D/F#:8 ,  , r:4  -2- |', '| C7(b9,#11):4. D/F#:8 , , r:4 -2- |'],
  ['signs, time and syncopation', '|( 4 / 4 )  <D.S.  al Coda>   <:8 C |', '| ( 4 / 4 ) <D.S.  al Coda> <:8 C |'],
  ['settings keep JSON bytes intact', '  % TITLE  =  "Song  \\"title\\"" \t\n%PARAM = { "x": 1e2, "y": [1,  2] }  ', '  %TITLE="Song  \\"title\\""\n%PARAM={ "x": 1e2, "y": [1,  2] }'],
  ['invalid settings are left alone', '% TITLE = "unfinished  \n%PARAM = {  \n|C|', '% TITLE = "unfinished  \n%PARAM = {  \n| C |'],
  ['Unicode text and meaningful non-ASCII spaces', '%TITLE = "🎵  譜面"\n[ A　B ]\n|`🎵  歌詞`  C|\n| C\u00a0D |', '%TITLE="🎵  譜面"\n[ A　B ]\n| `🎵  歌詞` C |\n| C\u00a0D |'],
  ['repeated blank lines', '\n\n[A]\n|C|\n \t\n\n\n|D|\n\n[B]\n|E|\n\n\n', '\n[A]\n| C |\n\n| D |\n\n[B]\n| E |\n\n'],
  ['repeated CRLF and CR blank lines', '|C|\r\n\r\n\r\n|D|\r\r\r|E|', '| C |\r\n\r\n| D |\r\r| E |'],
  ['blank lines inside text and labels', '[A\n\n\nB]\n|"one\n\n\ntwo"   `la\n\n\nla` C|', '[A\n\n\nB]\n| "one\n\n\ntwo" `la\n\n\nla` C |'],
  ['blank lines after a continuation are kept', '|C| \\\n\n\n\n|D|\n\n\n|E|', '| C | \\\n\n\n\n| D |\n\n| E |'],
  ['only whitespace', '  \r\n\t\n ', '\r\n'],
  ['empty document', '', '']
];

for (const [name, source, expected] of examples) {
  test(`formatting: ${name}`, () => {
    assert.equal(formatted(source), expected);
    assert.deepEqual(formattingEdits(expected), [], 'Formatting is idempotent');
  });
}

test('formatting leaves unterminated protected text untouched', () => {
  for (const tail of ['"unclosed  ', "'unclosed  ", '`unclosed  ', '[unclosed  ', '<D.S.  ', '(4 / 4  ', '-2  ']) {
    const source = `|C|  \n| ${tail}`;
    assert.deepEqual(formattingEdits(source), [], tail);
  }
});

test('formatting skips documents above its size limit', () => {
  assert.deepEqual(formattingEdits(' '.repeat(500_001)), []);
  assert.equal(formatted(' '.repeat(500_000)), '');
});

test('formatting preserves a long JSON string and trims only its surrounding whitespace', () => {
  const value = `"start${' '.repeat(200_000)}end"`;
  assert.equal(formatted(`%TITLE = ${value}  `), `%TITLE=${value}`);
});

test('formatting preserves upstream notation structure for shipped examples and valid whitespace variations', () => {
  // Parse only: engraving and pixel-level quality remain the upstream renderer's responsibility.
  const browser = { self: {} as { Fumen?: {
    Parser: new () => { parse(source: string): { exportCode(): string } | null };
  } } };
  // The browser bundle only needs `self` to expose its API; no DOM or rendering mocks.
  runInNewContext(readFileSync('media/vendor/fumen.js', 'utf8'), browser);
  assert.ok(browser.self.Fumen);
  const { Parser } = browser.self.Fumen;
  const sources = readdirSync('examples').filter(name => name.endsWith('.fumen'))
    .map(name => readFileSync(`examples/${name}`, 'utf8'));
  for (const name of ['docs/CHEATSHEET.md', 'docs/CHEATSHEET.ja.md']) {
    for (const match of readFileSync(name, 'utf8').matchAll(/```fumen\n([\s\S]*?)```/g)) sources.push(match[1]!);
  }
  sources.push('|Cmaj7   Dm7|\tG7||.  ', '| C   :||x3\n| D :||xX\n| E :||: F |',
    '[ A  B ]\n| "C  D"  `la  la`@  C , , D/F#:4 |  \\\n>| E |\n\n| F |',
    '% TITLE = "Song  title"\n%PARAM = { "text_size": 1e2 }\n|C|');
  for (const breaks of ['\n', '\n\n', '\n\n\n', '\n \t\n\n\n']) {
    sources.push(`[A]\n| C |${breaks}| D |${breaks}[B]\n| E |`,
      `| C | \\${breaks}| D |`, `| C |${breaks}%SHOW_STAFF="NO"${breaks}| D |`);
  }
  // Guard the oracle itself: deleting the only blank line changes block/group structure.
  assert.notEqual(new Parser().parse('| C |\n\n[B]\n| D |')?.exportCode(),
    new Parser().parse('| C |\n[B]\n| D |')?.exportCode());
  for (const source of sources) {
    const before = new Parser().parse(source);
    assert.ok(before, `Valid fixture: ${source}`);
    const after = new Parser().parse(formatted(source));
    assert.ok(after, `Still parses: ${source}`);
    assert.equal(after.exportCode(), before.exportCode(), source);
    assert.deepEqual(formattingEdits(formatted(source)), []);
  }
});
