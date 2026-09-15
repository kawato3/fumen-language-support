import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { NEW_SCORE, TEMPLATES } from '../../src/catalog';
import { complete, diagnose, hover } from '../../src/language';
import { scan } from '../../src/notation';

function at(input: string) {
  const offset = input.indexOf('¦');
  assert.notEqual(offset, -1);
  const text = input.replace('¦', '');
  return { text, offset, suggestions: complete(text, offset) };
}

function replace(input: string, label: string): string {
  const { text, suggestions } = at(input);
  const item = suggestions.find(suggestion => suggestion.label === label);
  assert.ok(item, `Missing ${label} in ${input}`);
  return text.slice(0, item.start) + item.insertText + text.slice(item.end);
}

test('setting completion inserts the assignment only when needed', () => {
  assert.equal(replace('%TI¦', 'TITLE'), '%TITLE="${1}"');
  assert.equal(replace('%TI¦TLE="曲名"', 'TITLE'), '%TITLE="曲名"');
  assert.equal(replace('%TI¦ = "曲名"', 'TITLE'), '%TITLE = "曲名"');
  assert.equal(at('%¦').suggestions.length, 8);
});

test('setting values replace whole JSON strings without duplicate quotes', () => {
  assert.equal(replace('%SHOW_STAFF=¦', '"YES"'), '%SHOW_STAFF="YES"');
  assert.equal(replace('%SHOW_STAFF="¦"', '"NO"'), '%SHOW_STAFF="NO"');
  assert.equal(replace('%SHOW_STAFF="Y¦ES"', '"YES"'), '%SHOW_STAFF="YES"');
  assert.equal(replace('%KEY_TYPE="¦#"', '"b"'), '%KEY_TYPE="b"');
  assert.equal(replace('%SHOW_STAFF= ¦NO', '"YES"'), '%SHOW_STAFF= "YES"');
  assert.equal(replace('%SHOW_STAFF=Y¦', '"YES"'), '%SHOW_STAFF="YES"');
});

test('free text and musical values never offer chord or setting completions', () => {
  for (const text of ['| C¦ |', '| Cm7¦ |', '| C7#9#13¦ |', '| Bb/Ab¦ |', '%TITLE="C¦"', '%KEY="C¦"', '%TRANSPOSE="D¦"', '| `歌詞 %¦`@ C |', "| '注記 <¦' C |", '[サビ %¦]']) {
    assert.deepEqual(at(text).suggestions, [], text);
  }
});

test('sign completions respect alignment and preserve adjacent measure text', () => {
  assert.equal(replace('| <D¦.S.> C |', '<D.S.>'), '| <D.S.> C |');
  assert.equal(replace('| <to ¦ C |', '<to Coda>'), '| <to Coda> C |');
  assert.equal(replace('| <¦|', '<S>'), '| <S>|');
  assert.deepEqual(at('<¦| C |').suggestions, []);
  assert.deepEqual(at('>¦| C |').suggestions, []);
  assert.deepEqual(at('| <Coda>¦ C |').suggestions, []);
});

test('sign completion cannot consume a closing angle bracket belonging to later notation', () => {
  for (const suffix of [' C | <Fine> |', ' C |\n>| F |', " '>' C |", ' `>`@ C |']) {
    assert.equal(replace(`| <D¦${suffix}`, '<D.S.>'), `| <D.S.>${suffix}`);
  }
  assert.equal(replace('| <D¦> C |', '<D.S.>'), '| <D.S.> C |');
});

test('duration completions work on chords, rests, duration-only slashes and syncopation', () => {
  for (const input of ['| C:¦ |', '| r:¦ |', '| :¦ |', '| <:¦ C |']) {
    assert.ok(at(input).suggestions.some(item => item.label === '4'), input);
  }
  assert.equal(replace('| C:¦8~ |', '4'), '| C:4~ |');
  assert.equal(replace('| C:4¦. |', '4.'), '| C:4. |');
  assert.equal(replace('| C:¦4_3 |', '8'), '| C:8_3 |');
  assert.deepEqual(at('||:¦ C |').suggestions, []);
  assert.deepEqual(at('| C :||¦').suggestions, []);
  assert.deepEqual(at('C:¦').suggestions, []);
  assert.deepEqual(at('%TITLE="C:¦"').suggestions, []);
});

test('valid settings include AUTO, custom renderer parameters and escaped JSON', () => {
  const text = [
    '%TITLE="文字列 \\" 引用符"', '%SHOW_STAFF="AUTO"', '%KEY_TYPE="AUTO"',
    '%TRANSPOSE=-2', '%TRANSPOSE="Db"', '%PARAM={"paper_width": 800}',
    '%CUSTOM=[1, true, null]', '%SHOW_HEADER="NO"'
  ].join('\r\n');
  assert.deepEqual(diagnose(text), []);
});

test('settings diagnose malformed JSON, wrong types and definite enum errors', () => {
  assert.equal(diagnose('%TITLE 曲名')[0]?.code, 'variable-assignment');
  assert.equal(diagnose('%TITLE=曲名')[0]?.code, 'variable-json');
  assert.equal(diagnose('%TITLE="A" %ARTIST="B"')[0]?.code, 'variable-json');
  assert.equal(diagnose('%TITLE=123')[0]?.code, 'variable-type');
  assert.equal(diagnose('%TRANSPOSE=1.5')[0]?.code, 'variable-type');
  assert.equal(diagnose('%SHOW_STAFF=true')[0]?.code, 'variable-type');
  assert.equal(diagnose('%SHOW_STAFF="yes"')[0]?.code, 'variable-value');
  assert.equal(diagnose('%CUSTOM={bad}')[0]?.code, 'variable-json');
  assert.deepEqual(diagnose('%KEY="anything"'), []);
});

test('diagnostics identify unmatched notation, not music', () => {
  for (const input of ['[A', '| (4/4', '| <D.S.', "| 'text", '| `歌詞', '| "text']) {
    assert.equal(diagnose(input)[0]?.code, 'unclosed-delimiter', input);
  }
  assert.equal(diagnose(']')[0]?.code, 'unexpected-delimiter');
  assert.equal(diagnose(')')[0]?.code, 'unexpected-delimiter');
  assert.deepEqual(diagnose('| C7(b9,#11) Cm7-5 C7#9#13 /Ab |'), []);
  assert.deepEqual(diagnose('| C:3 r:128 | <D.S.2 al Coda2> |'), []);
  assert.deepEqual(diagnose('| C D E F G A B | [any ending] C |'), []);
});

test('quoted text and labels shield punctuation, including multiline text', () => {
  assert.deepEqual(diagnose("[Don't stop]\n| 'annotation %BAD ] ( <' C |\n| `日本語\n%BAD [ ( <`@ C |"), []);
  assert.deepEqual(at('| `日本語\n%¦`@ C |').suggestions, []);
  assert.deepEqual(diagnose('[A]\n>| C |\n<| D |\n| <:16 C:2 D:2 |'), []);
});

test('diagnostic offsets use UTF-16, including Japanese and emoji', () => {
  const text = '%TITLE="🎵 日本語"\r\n[A';
  const issue = diagnose(text)[0]!;
  assert.equal(text.slice(issue.start, issue.end), '[');
  assert.equal(issue.start, text.indexOf('['));
});

test('hover explains notation without analyzing chord names', () => {
  assert.equal(hover('%SHOW_STAFF="YES"', 4)?.title, '%SHOW_STAFF');
  assert.equal(hover('[A]', 1)?.title, 'Section label');
  assert.equal(hover('| [1.] C |', 3)?.title, 'Repeat ending');
  assert.equal(hover('| <D.S.2 al Coda2> C |', 6)?.title, '<D.S.2 al Coda2>');
  assert.equal(hover('| C:4. |', 5)?.description, 'Dotted quarter note');
  assert.equal(hover('| Cm7-5 |', 4), undefined);
  assert.equal(hover('| r:4 |', 2)?.title, 'Rest');
  assert.equal(hover('| <:16 C |', 3)?.title, 'Syncopation');
});

test('document examples pass basic diagnostics', () => {
  for (const name of ['basic', 'notation', 'notation-en']) {
    assert.deepEqual(diagnose(readFileSync(`docs/examples/${name}.fumen`, 'utf8')), [], name);
  }
});

test('packaged snippets and command templates stay consistent', () => {
  const snippets = JSON.parse(readFileSync('resources/language/snippets.json', 'utf8')) as Record<string, { body: string | string[] }>;
  const body = (label: string) => {
    const snippet = snippets[label]!.body;
    return Array.isArray(snippet) ? snippet.join('\n') : snippet;
  };
  assert.equal(body('New Score'), NEW_SCORE);
  for (const template of TEMPLATES) assert.equal(body(template.label), template.body);
});

test('scanner respects longest repeat boundaries', () => {
  assert.deepEqual(scan('||: C :||:x3 D :||xX E ||.').tokens.filter(token => token.kind === 'bar').map(token => token.text), ['||:', ':||:x3', ':||xX', '||.']);
});

test('large collections of invalid settings cap the diagnostic count', () => {
  assert.equal(diagnose('%TITLE=123\n'.repeat(1000)).length, 100);
});
