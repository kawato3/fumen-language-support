import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { formattingEdits } from '../../src/formatting';

interface FumenNode {
  childNodes: FumenNode[];
  name?: string;
  inline?: boolean;
  raw_new_line?: boolean;
  align?: string;
  exportCode(): string;
  getVariable(name: string): unknown;
}

// Parse only: engraving and pixel-level quality remain the upstream renderer's responsibility.
const browser = { self: {} as { Fumen?: {
  Parser: new () => { parse(source: string): FumenNode | null };
  Measure: new () => FumenNode & { renderprop: object };
  Variable: new () => FumenNode & { value: unknown };
} } };
// The browser bundle only needs `self` to expose its API; no DOM or rendering mocks.
runInNewContext(readFileSync('resources/vendor/fumen.js', 'utf8'), browser);
assert.ok(browser.self.Fumen);
const { Parser, Measure, Variable } = browser.self.Fumen;

function scoreSnapshot(source: string): unknown {
  const track = new Parser().parse(source);
  assert.ok(track, `Valid Fumen fixture: ${source}`);
  function snapshot(node: FumenNode): unknown {
    const names = ['TITLE', 'SUB_TITLE', 'ARTIST', 'KEY', 'TRANSPOSE', 'KEY_TYPE', 'SHOW_STAFF', 'SHOW_FOOTER', 'PARAM'];
    return {
      type: node.constructor.name, name: node.name, inline: node.inline,
      newLine: node.raw_new_line, align: node.align,
      settings: Object.fromEntries(names.map(name => [name, node.getVariable(name)])),
      notation: node instanceof Measure ? node.exportCode() : undefined,
      children: node instanceof Measure ? [] : node.childNodes.filter(child => !(child instanceof Variable)).map(snapshot)
    };
  }
  // Normalize objects from the isolated VM for strict equality; object member
  // order is irrelevant, but group/measure order and effective settings are not.
  return JSON.parse(JSON.stringify(snapshot(track)));
}

function formatted(source: string): string {
  const edits = formattingEdits(source);
  let end = source.length;
  let result = source;
  for (const edit of [...edits].reverse()) {
    assert.ok(edit.start >= 0 && edit.start <= edit.end && edit.end <= end, 'Ordered, non-overlapping UTF-16 offsets');
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

const settingExamples: [string, string, string][] = [
  ['the requested setting order',
    '%PARAM={}\n%SHOW_FOOTER="NO"\n%KEY_TYPE="flat"\n%TRANSPOSE=2\n%KEY="C"\n%ARTIST="Artist"\n%TITLE="Title"\n%SHOW_STAFF="YES"\n%SUB_TITLE="Subtitle"',
    '%TITLE="Title"\n%SUB_TITLE="Subtitle"\n%ARTIST="Artist"\n%KEY="C"\n%TRANSPOSE=2\n%KEY_TYPE="flat"\n%SHOW_STAFF="YES"\n%SHOW_FOOTER="NO"\n%PARAM={}'],
  ['missing settings and stable unknown settings',
    '%Z_EXTRA=1\n%PARAM={}\n%A_EXTRA=2\n%ARTIST="Artist"',
    '%ARTIST="Artist"\n%PARAM={}\n%Z_EXTRA=1\n%A_EXTRA=2'],
  ['top-level PARAM keys, with stable unknown keys',
    '%PARAM={"z":0,"chord_suffix_style":"inline","major_label":"M","a":1,"minor_label":"m","paper_height":1100,"paper_width":800}',
    '%PARAM={"paper_width":800,"paper_height":1100,"minor_label":"m","major_label":"M","chord_suffix_style":"inline","z":0,"a":1}'],
  ['JSON member spelling, nesting, escapes and whitespace',
    String.raw`% PARAM = { "nested": {"paper_height":-0,"paper_width":9007199254740993},  "major_label" : "M", "paper_width":8e2, "minor_label":"m", "text":"comma, quote\" backslash\\ brace}", "array":[1, {"x":2}] }  `,
    String.raw`%PARAM={ "paper_width":8e2,  "minor_label":"m", "major_label" : "M", "nested": {"paper_height":-0,"paper_width":9007199254740993}, "text":"comma, quote\" backslash\\ brace}", "array":[1, {"x":2}] }`],
  ['escaped member names are recognized without rewriting them',
    String.raw`%PARAM={"minor_label":"m","paper_\u0077idth":800}`,
    String.raw`%PARAM={"paper_\u0077idth":800,"minor_label":"m"}`],
  ['duplicate settings keep their order and are not merged',
    '%PARAM = {"minor_label":"m","paper_width":800}\n%TITLE = "Title"\n%PARAM = {"paper_height":1100}',
    '%PARAM={"minor_label":"m","paper_width":800}\n%TITLE="Title"\n%PARAM={"paper_height":1100}'],
  ['invalid settings prevent sorting the run',
    '%PARAM = {}\n%TITLE = "unfinished\n%ARTIST = "Artist"',
    '%PARAM={}\n%TITLE = "unfinished\n%ARTIST="Artist"'],
  ['duplicate JSON keys are not removed or reordered',
    String.raw`%PARAM = {"minor_label":"m","paper_width":800,"paper_\u0077idth":900}`,
    String.raw`%PARAM={"minor_label":"m","paper_width":800,"paper_\u0077idth":900}`],
  ['PARAM arrays, scalars and empty objects stay unchanged',
    '%PARAM = [3, 1, 2]\n\n%PARAM = null\n\n%PARAM = { }',
    '%PARAM=[3, 1, 2]\n\n%PARAM=null\n\n%PARAM={ }'],
  ['blank lines, sections and measures separate runs',
    '%PARAM={}\n%TITLE="Global"\n\n%ARTIST="Artist"\n[A]\n%PARAM={}\n%KEY="C"\n|C|\n%SHOW_STAFF="YES"\n%TRANSPOSE=2\n|D|\n%TITLE="Later"',
    '%TITLE="Global"\n%PARAM={}\n\n%ARTIST="Artist"\n[A]\n%KEY="C"\n%PARAM={}\n| C |\n%TRANSPOSE=2\n%SHOW_STAFF="YES"\n| D |\n%TITLE="Later"'],
  ['continuations and inline settings separate runs',
    '%ARTIST="Artist"\n\\\n%TITLE="Title"\n[A] %PARAM={}\n%KEY="C"',
    '%ARTIST="Artist"\n\\\n%TITLE="Title"\n[A] %PARAM={}\n%KEY="C"'],
  ['setting-looking lines inside protected text stay untouched',
    '[A]\n| `lyrics\n%PARAM = {}\n%TITLE = "Title"\nend` C |\n%PARAM={}\n%TITLE="Real title"',
    '[A]\n| `lyrics\n%PARAM = {}\n%TITLE = "Title"\nend` C |\n%TITLE="Real title"\n%PARAM={}'],
  ['indentation, CRLF, assignment spacing and missing final newline',
    '  % PARAM = {"minor_label":"m","paper_width":800}  \r\n\t% TITLE = "🎵  Title"  ',
    '  %TITLE="🎵  Title"\r\n\t%PARAM={"paper_width":800,"minor_label":"m"}']
];

for (const [name, source, expected] of settingExamples) {
  test(`formatting settings: ${name}`, () => {
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
  assert.equal(formatted(`%PARAM={"text":${value},"paper_width":800}`),
    `%PARAM={"paper_width":800,"text":${value}}`);
});

test('formatting preserves upstream notation structure for shipped examples and valid whitespace variations', () => {
  const sources = readdirSync('docs/examples').filter(name => name.endsWith('.fumen'))
    .map(name => readFileSync(`docs/examples/${name}`, 'utf8'));
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
  assert.notDeepEqual(scoreSnapshot('| C |\n\n[B]\n| D |'), scoreSnapshot('| C |\n[B]\n| D |'));
  for (const source of sources) {
    assert.deepEqual(scoreSnapshot(formatted(source)), scoreSnapshot(source), source);
    assert.deepEqual(formattingEdits(formatted(source)), []);
  }
});

test('formatting preserves effective global and per-measure settings in the upstream parser', () => {
  const source = [
    '%PARAM={"minor_label":"m","paper_width":800}', '%SHOW_FOOTER="NO"', '%KEY_TYPE="AUTO"',
    '%TRANSPOSE=0', '%KEY="C"', '%ARTIST="Artist"', '%TITLE="Title"', '%SHOW_STAFF="NO"', '%SUB_TITLE="Subtitle"',
    '', '[A]', '%PARAM={"major_label":"M","paper_height":1100}', '%KEY="D"', '| C |',
    '%SHOW_STAFF="YES"', '%TRANSPOSE=2', '| D |', '',
    '%PARAM={"paper_width":900}', '%KEY="G"', '%PARAM={"paper_height":1200}', '| E |',
    '', '[B]', '| F |'
  ].join('\n');
  assert.notEqual(formatted(source), source, 'The fixture exercises actual sorting');
  assert.deepEqual(scoreSnapshot(formatted(source)), scoreSnapshot(source));
  const changesMidScore = '%SHOW_STAFF="NO"\n[A]\n| C |\n%SHOW_STAFF="YES"\n| D |';
  const movedBeforeScore = '%SHOW_STAFF="NO"\n%SHOW_STAFF="YES"\n[A]\n| C |\n| D |';
  assert.notDeepEqual(scoreSnapshot(changesMidScore), scoreSnapshot(movedBeforeScore),
    'The oracle detects an unsafe move across a measure');
  assert.notDeepEqual(scoreSnapshot('%PARAM={"paper_width":800}\n%PARAM={"paper_height":1100}\n| C |'),
    scoreSnapshot('%PARAM={"paper_width":800,"paper_height":1100}\n| C |'),
    'Separate PARAM assignments replace rather than merge objects');
});
