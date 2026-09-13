import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Registry, parseRawGrammar, INITIAL } from 'vscode-textmate';
import { loadWASM, OnigScanner, OnigString } from 'vscode-oniguruma';

test('TextMate grammar highlights settings, chords, rhythm and Japanese text', async () => {
  const wasm = readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'));
  await loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
  const registry = new Registry({
    onigLib: Promise.resolve({ createOnigScanner: sources => new OnigScanner(sources), createOnigString: source => new OnigString(source) }),
    loadGrammar: async scope => scope === 'source.fumen' ? parseRawGrammar(readFileSync('syntaxes/fumen.tmLanguage.json', 'utf8'), 'fumen.json') : null
  });
  try {
    const grammar = await registry.loadGrammar('source.fumen');
    assert.ok(grammar);
    const scopeAt = (line: string, fragment: string) => {
      const index = line.indexOf(fragment);
      const tokens = grammar.tokenizeLine(line, INITIAL).tokens;
      return tokens.find(token => token.startIndex <= index && index < token.endIndex)?.scopes ?? [];
    };
    const cases = [
      ['%TITLE="曲名"', 'TITLE', 'variable.other.setting.fumen'],
      ['%TITLE="曲名"', '曲名', 'string.quoted.double.json.fumen'],
      ['[サビ]', 'サビ', 'entity.name.section.fumen'],
      ['| [1.] C |', '1.', 'constant.other.volta.fumen'],
      ['| C7#9#13:4. |', 'C7', 'support.type.chord.fumen'],
      ['| C7#9#13:4. |', ':4.', 'constant.numeric.duration.fumen'],
      ['| `歌詞 %TITLE`@ C |', '%TITLE', 'string.quoted.other.lyric.fumen'],
      ["| '注記 <D.S.>' C |", '<D.S.>', 'string.quoted.single.annotation.fumen'],
      ['| C :||x3', ':||x3', 'keyword.control.bar.fumen'],
      ['>| C |', '>', 'keyword.control.alignment.fumen'],
      ['| <:16 C |', '<', 'keyword.control.syncopation.fumen'],
      ['| <D.S. al Coda> C |', '<D.S.', 'keyword.control.repeat.fumen'],
      ['| /Ab |', 'Ab', 'support.type.chord.fumen']
    ];
    for (const [line, fragment, scope] of cases) assert.ok(scopeAt(line!, fragment!).includes(scope!), `${line}: ${fragment} should be ${scope}`);
    const invalidVariable = grammar.tokenizeLine('%TITLE="unfinished', INITIAL);
    assert.ok(grammar.tokenizeLine('[A]', invalidVariable.ruleStack).tokens.some(token => token.scopes.includes('entity.name.section.fumen')));
    const lyric = grammar.tokenizeLine('| `歌詞', INITIAL);
    assert.ok(grammar.tokenizeLine('%TITLE`@ C |', lyric.ruleStack).tokens[0]?.scopes.includes('string.quoted.other.lyric.fumen'));
    // Verify no zero-length begin/end rule hangs on ordinary short chord tokens.
    assert.ok(grammar.tokenizeLine('| C | D | E | F | G | A | B |', INITIAL).tokens.length > 10);
  } finally {
    registry.dispose();
  }
});
