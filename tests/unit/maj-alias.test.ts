import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

// The UMD bundle exposes its parser with only `self`; no browser or DOM is needed.
const Fumen = runInNewContext(readFileSync('resources/vendor/fumen.js', 'utf8') + '\nself.Fumen;', { self: {} });

test('maj matches M across major-mark positions and preserves spelling on export and clone', () => {
  const spellings = ['Cmaj', 'Cmaj7', 'Fmaj7', 'Bbmaj9', 'Cmaj7/G:4.', 'Cmmaj7',
    'Cmimaj7', 'Cminmaj7', 'Cdimmaj7', 'Caugmaj7', 'C+maj7', 'Cmajsus4',
    'Cmaj7add11', 'Cmaj9(b9,#11)', ...['5', '6', '69', '11', '13'].map(n => `Cmaj${n}`)];
  for (const text of spellings) {
    const alias = new Fumen.Chord(text);
    const canonical = new Fumen.Chord(text.replace('maj', 'M'));
    assert.ok(canonical.is_valid_chord && alias.is_valid_chord, text);
    assert.deepEqual(alias.mid_elem_objs, canonical.mid_elem_objs, text);
    assert.deepEqual(alias.note_group_list, canonical.note_group_list, text);
    assert.deepEqual(alias.getChordStrBase(2, 'b', 'C'), canonical.getChordStrBase(2, 'b', 'C'), text);
    assert.equal(alias.exportCode(), text);
    assert.equal(alias.clone().exportCode(), text);
  }
});

test('score round trips retain maj, lyrics, annotations and the existing quoted-text grammar', () => {
  const source = '%TITLE="Cmaj7"\n| `Cmaj7`@ Cmaj7/G | \'Cmmaj7\'@ Cmmaj7 | "Fmaj7" | "CM7" |';
  const track = new Fumen.Parser().parse(source);
  const chords = track.find((node: object) => node instanceof Fumen.Chord, true);
  assert.ok(chords[0].is_valid_chord && chords[1].is_valid_chord);
  assert.equal(chords[2].is_valid_chord, false, 'Quoted maj remains text');
  assert.equal(chords[2].clone().is_valid_chord, false);
  assert.equal(chords[2].clone().exportCode(), '"Fmaj7"');
  assert.equal(chords[3].is_valid_chord, true, 'Quoted M keeps its previous meaning');
  const exported = track.exportCode();
  for (const fragment of ['%TITLE="Cmaj7"', '`Cmaj7`@ Cmaj7/G', "'Cmmaj7'@ Cmmaj7", '"Fmaj7"', 'CM7']) {
    assert.ok(exported.includes(fragment), fragment);
  }
  assert.equal(new Fumen.Parser().parse(exported).exportCode(), exported);
});

test('minor aliases stay minor and partial or mixed-case major aliases stay invalid', () => {
  const minor = new Fumen.Chord('Cm7').mid_elem_objs;
  for (const text of ['Cmi7', 'Cmin7']) assert.deepEqual(new Fumen.Chord(text).mid_elem_objs, minor);
  assert.notDeepEqual(minor, new Fumen.Chord('CM7').mid_elem_objs);
  for (const text of ['Cma7', 'CMaj7', 'Cmajmaj7']) assert.equal(new Fumen.Chord(text).is_valid_chord, false, text);
});
