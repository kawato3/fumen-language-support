import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('every bundled third-party component retains its license and attribution', () => {
  const notices = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');
  const licenses = [
    ['FUMEN-LICENSE.txt', 'Copyright (c) 2020 Hiroyuki Baba'],
    ['OFL.txt', 'SIL OPEN FONT LICENSE Version 1.1'],
    ['BABEL-LICENSE.txt', 'MIT License'],
    ['CORE-JS-LICENSE.txt', 'Permission is hereby granted'],
    ['REGENERATOR-LICENSE.txt', 'Permission is hereby granted'],
    ['WEBPACK-LICENSE.txt', 'Copyright JS Foundation and other contributors']
  ];
  for (const [filename, copyright] of licenses) {
    assert.ok(readFileSync(`media/vendor/${filename}`, 'utf8').includes(copyright!), filename);
    assert.ok(notices.includes(`media/vendor/${filename}`), `${filename} is discoverable in third-party notices`);
  }
  const bundle = readFileSync('media/vendor/fumen.js', 'utf8');
  assert.ok(bundle.includes('Copyright (c) 2020 Hiroyuki Baba'));
  assert.ok(bundle.includes('SIL OPEN FONT LICENSE Version 1.1'));
});
