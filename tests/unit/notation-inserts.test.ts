import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NOTATION_INSERT_GROUPS } from '../../src/notation-inserts';
import { SIGNS } from '../../src/catalog';

const inserts = NOTATION_INSERT_GROUPS.flatMap(group => group.items);

test('notation insert catalog covers the non-musical building blocks of a score', () => {
  assert.deepEqual(NOTATION_INSERT_GROUPS.map(group => group.label), [
    'Structure and bars', 'Navigation signs', 'Rhythm', 'Text', 'Score settings'
  ]);
  assert.deepEqual(inserts.filter(item => item.id.startsWith('navigation.')).map(item => item.body.replace(/\s*\$0$/, '')),
    SIGNS.map(sign => sign.value));

  for (const item of inserts) {
    assert.match(item.id, /^[a-z]+(?:\.[a-z-]+)+$/);
    assert.ok(item.label.length > 0, item.id);
    assert.ok(!Object.hasOwn(item, 'description'), `${item.id} repeats its label with a description`);
    assert.match(item.body, /\$0$/, `${item.id} leaves the cursor at the end`);
  }
});

test('notation insert labels show the Fumen spelling without redundant summaries', () => {
  const byId = (id: string) => inserts.find(item => item.id === id)?.label;
  assert.equal(byId('structure.measure-boundary'), 'Bar line (|)');
  assert.equal(byId('structure.repeat-end-with-count'), 'Repeat end with count (:||x3)');
  assert.equal(byId('structure.four-bars'), 'Four measures (editable)');
  assert.equal(byId('rhythm.duration'), 'Duration (:4)');
  assert.equal(byId('text.annotation'), "Annotation ('text'@)");
  assert.equal(byId('settings.staff-visibility'), 'Staff visibility (%SHOW_STAFF)');
});

test('notation inserts use editable snippets without choosing chords or musical content', () => {
  const byId = (id: string) => inserts.find(item => item.id === id)?.body;
  assert.equal(byId('structure.repeat-end-with-count'), ':||x${1:3}$0');
  assert.equal(byId('structure.time-signature'), '(${1:4}/${2:4}) $0');
  assert.equal(byId('rhythm.duration'), ':${1|1,2,4,8,16,32,64,2.,4.,8.,16.|}$0');
  assert.equal(byId('text.annotation'), "'${1:annotation}'@ $0");
  assert.equal(byId('text.lyrics'), '`${1:lyrics}`@ $0');
  assert.equal(byId('settings.staff-visibility'), '%SHOW_STAFF="${1|YES,NO,AUTO|}"$0');
  assert.ok(!inserts.some(item => /\b(?:Am|Cmaj|chord progression)\b/i.test(`${item.label} ${item.body}`)));
});
