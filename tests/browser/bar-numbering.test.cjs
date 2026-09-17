const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const { chromium } = require('playwright-core');
const { build } = require('esbuild');
const { readFile } = require('node:fs/promises');
const { findChrome } = require('../../build/extension/print-platform');
let browser;

before(async () => {
  const executablePath = await findChrome(process.env.FUMEN_CHROME_PATH || '');
  assert.ok(executablePath, 'Install Google Chrome or set FUMEN_CHROME_PATH');
  browser = await chromium.launch({ executablePath, headless: true });
});
after(async () => { await browser?.close(); });

async function render(source, parameters = { bar_number: 'on' }) {
  const page = await browser.newPage();
  try {
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.route(/^https?:/, route => { errors.push('Unexpected network request'); return route.abort(); });
    await page.addScriptTag({ path: 'resources/vendor/fumen.js' });
    const result = await page.evaluate(async ({ source, parameters }) => {
      const calls = [], rows = [], canvases = [];
      const track = new Fumen.Parser().parse('%SHOW_FOOTER="NO"\n%PARAM=' + JSON.stringify(parameters) + '\n' + source);
      if (!track) throw new Error('Invalid test score');
      const renderer = new Fumen.DefaultRenderer(() => {
        const canvas = document.createElement('canvas');
        canvases.push(canvas);
        const ctx = canvas.getContext('2d'), original = ctx.fillText;
        ctx.fillText = function (text, x, y) {
          calls.push({ text, x, y, align: this.textAlign, baseline: this.textBaseline, font: this.font, page: canvases.length });
          return original.apply(this, arguments);
        };
        return canvas;
      });
      const renderRow = renderer.renderMeasureRow;
      renderer.renderMeasureRow = function (...args) {
        const result = renderRow.apply(this, args);
        if (result) {
          const first = args[3][0];
          rows.push({ x: first.renderprop.sx, y: first.renderprop.y, page: canvases.length });
        }
        return result;
      };
      const result = await renderer.render(track);
      return { calls, rows, status: result.barNumbering ?? null,
        pages: canvases.map(c => ({ width: c.width, height: c.height })) };
    }, { source, parameters });
    assert.deepEqual(errors, []);
    return result;
  } finally { await page.close(); }
}
// Numbered Coda signs also draw right-aligned digits. Identify bar numbers by
// their row-start position, not just by text, so navigation text cannot mask a
// missing label or create a false extra label.
const labels = result => result.calls.filter(call => call.align === 'right' && /^-?\d+(,-?\d+)*$/.test(call.text) &&
  result.rows.some(row => row.page === call.page && call.x === row.x - 4 && Math.abs(call.y - row.y) < 5));

test('R01: only the exact on string enables numbering; existing drawing is unchanged', async () => {
  const source = '[A]\n||: C | G :||\n| F | C ||.';
  const baseline = await render(source, {});
  for (const value of ['off', '', true, 1, null, [], {}, 'ON']) assert.deepEqual(await render(source, { bar_number: value }), baseline);
  const enabled = await render(source);
  assert.deepEqual(labels(enabled).map(c => c.text), ['1,3', '5']);
  assert.deepEqual(enabled.calls.filter(c => !labels(enabled).includes(c)), baseline.calls);
  assert.deepEqual(enabled.pages, baseline.pages);
  assert.deepEqual(enabled.rows, baseline.rows);
  assert.equal(enabled.status.stop, null);
});

for (const [start, expected] of [[0, ['0,2', '4']], [-10, ['-10,-8', '-6']], [30, ['30,32', '34']]]) {
  test(`R06: custom start ${start} reaches the actual row labels`, async () => {
    const result = await render('||: C | G :||\n| F |', { bar_number: 'on', bar_start: start });
    assert.deepEqual(labels(result).map(c => c.text), expected);
    assert.equal(result.status.stop, null);
  });
}
test('R06: invalid starting values fall back to one and bar_start alone does not enable numbering', async () => {
  const source = '| C |\n| G |';
  const baseline = await render(source);
  for (const start of [null, true, '0', [], {}, 0.5, 9007199254740992]) {
    assert.deepEqual(await render(source, { bar_number: 'on', bar_start: start }), baseline);
  }
  assert.deepEqual(await render(source, { bar_start: 0 }), await render(source, {}));
});
test('R06: the first measure selects the start; later settings and visibility do not restart it', async () => {
  const source = '[A]\n%PARAM={"bar_number":"off","bar_start":0}\n| C |\n\n' +
    '%PARAM={"bar_number":"on","bar_start":30}\n| G |\n| F |';
  const result = await render(source, { bar_number: 'on', bar_start: -10 });
  assert.deepEqual(labels(result).map(c => c.text), ['1', '2']);
  assert.equal(result.status.stop, null);
  // A later inline group can share the rendered row, but cannot change the start.
  const inline = await render('[A]\n| C |\n[B]\n%PARAM={"bar_start":30}\n| D |', { bar_number: 'on', bar_start: 0 });
  assert.deepEqual(labels(inline).map(c => c.text), ['0']);
});

for (const [name, source, expected] of [
  ['repeat endings', '||: C |\n|[1.] D :||\n|[2.] E |\n| F |', ['1,3', '2', '4', '5']],
  ['range ending', '||: C |\n|[1.] D |\n|[2-3.] E :||x3\n| F |', ['1,3,5', '2', '4,6', '7']],
  ['shared boundary', '||: C | D :||:\n| E | F :||\n| G |', ['1,3', '5,7', '9']],
  ['long rest', '| -4- |\n| C |', ['1', '5']],
  ['D.S. al Fine', '| C |\n| <S2> D |\n| E <Fine> |\n| F <D.S.2 al Fine> |', ['1', '2,5', '3,6', '4']],
  ['D.C. al Coda', '| C |\n| D <to Coda> |\n| E <D.C. al Coda> |\n| F |\n| <Coda> G |', ['1,4', '2,5', '3', '6']],
  ['consumed Coda transfer', '| <S> C |\n| D <to Coda1> |\n| E <D.S. al Coda1> |\n| <Coda1> F |\n| G <to Coda2> |\n| A |\n| <Coda2> B |\n| C |',
    ['1,4', '2,5', '3', '6', '7', '8', '9', '10']],
  ['unplayed ending with conflicting jumps', '||: C |\n|[2.] D <D.C.> <D.S.> |\n| E :||x1\n| F |', ['1', '2']],
  ['with repeat', '||: <S with repeat> C |\n| D :||\n| E <Fine> |\n| F <D.S. al Fine> |', ['1,3,7,9', '2,4,8,10', '5,11', '6']]
]) test(`R02: real parser and renderer — ${name}`, async () => {
  const result = await render(source);
  assert.deepEqual(labels(result).map(c => c.text), expected);
  assert.equal(result.status.stop, null);
});

test('R02: inline groups, right-aligned rows and fixed-measure generated rows', async () => {
  const source = '[A]\n| C | D | E | F |\n[B]\n| G | A |\n>| B | C |';
  const actual = await render(source);
  assert.deepEqual(labels(actual).map(c => c.text), ['1', '7']);
  const aligned = await render('| C | D | E | F |\n>| G | A |');
  assert.ok(aligned.rows[1].x > aligned.rows[0].x);
  assert.equal(labels(aligned)[1].x, aligned.rows[1].x - 4);
  const generated = await render('| C | D | E | F | G |', { bar_number: 'on', row_gen_mode: 'constant_n_meas', row_gen_n_meas: 2 });
  assert.deepEqual(labels(generated).map(c => c.text), ['1', '3', '5']);
});
for (const staff of ['YES', 'NO']) test(`R03: placement with staff ${staff}, repeat, rehearsal, Segno and comment`, async () => {
  const result = await render(`%SHOW_STAFF="${staff}"\n[A]\n||: <S> 'Play softly' C:1 | D:1 :||\n| E:1 |`);
  assert.equal(labels(result).length, result.rows.length);
  labels(result).forEach((label, index) => {
    assert.ok(label.x < result.rows[index].x);
    // The text helper compensates the font's top bearing, rather than aligning
    // its baseline to the boundary. Allow that small, font-dependent correction.
    assert.ok(Math.abs(label.y - result.rows[index].y) < 5);
    assert.equal(label.align, 'right');
    assert.equal(label.baseline, 'top');
    assert.ok(parseFloat(/([\d.]+)px/.exec(label.font)[1]) < 14);
  });
});
test('R04: local off/on affects visibility, not the accumulated count', async () => {
  const result = await render('| C |\n\n%PARAM={"bar_number":"off"}\n| D |\n\n%PARAM={"bar_number":"on"}\n| E |');
  assert.deepEqual(labels(result).map(c => c.text), ['1', '3']);
});
test('R02: numbering continues across pages without changing layout', async () => {
  const source = Array.from({ length: 24 }, () => '| C | D |').join('\n');
  const result = await render(source, { bar_number: 'on', paper_height: 500 });
  const baseline = await render(source, { paper_height: 500 });
  assert.ok(result.pages.length > 1);
  assert.deepEqual(result.pages, baseline.pages);
  assert.deepEqual(labels(result).map(c => c.text), Array.from({ length: 24 }, (_, i) => String(i * 2 + 1)));
});
for (const [source, reason, expected] of [
  ['||: C |\n| D :||xX\n| E |', 'indefinite-repeat', ['1', '2']],
  ['| C <D.S.> |\n| D |', 'invalid-navigation', ['1']],
  ['||: C |\n|[Solo] D :||\n| E |', 'unsupported-ending', ['1']]
]) test(`R05: ${reason} preserves score rendering and the known prefix`, async () => {
  const result = await render(source);
  assert.deepEqual(labels(result).map(c => c.text), expected);
  assert.equal(result.status.stop.reason, reason);
  assert.equal(result.rows.length, source.split('\n').length);
});

test('R04/R05: preview notices are localized, non-blocking and cleared on the next successful render', async () => {
  const main = await build({ entryPoints: ['src/webview/main.ts'], bundle: true, write: false, format: 'iife', platform: 'browser' });
  const japanese = JSON.parse(await readFile('resources/l10n/bundle.l10n.ja.json', 'utf8'));
  for (const language of ['en', 'ja']) {
    const page = await browser.newPage();
    try {
      await page.setContent('<body><div id="viewport"><div id="pages"></div></div><div id="status"></div>' +
        '<button id="fit"></button><span id="zoom"></span><button id="print"></button>' +
        '<button id="zoom-out"></button><button id="zoom-in"></button><button id="refresh"></button></body>');
      await page.evaluate(bundle => {
        document.body.dataset.l10n = JSON.stringify(bundle);
        window.acquireVsCodeApi = () => ({ postMessage() {}, getState() {}, setState() {} });
      }, language === 'ja' ? japanese : {});
      await page.addScriptTag({ path: 'resources/vendor/fumen.js' });
      await page.addScriptTag({ content: main.outputFiles[0].text });
      const samples = [
        ['%PARAM={"bar_number":"on"}\n||: C | G :||xX\n| F |', language === 'ja' ? /回数未定/ : /indefinite repeat/],
        ['%PARAM={"bar_number":"on"}\n| C <D.S.> |', language === 'ja' ? /演奏順を確定できず/ : /could not be determined/],
        ['%PARAM={"bar_number":"on"}\n||: C :||x99999999', language === 'ja' ? /安全上限/ : /safety limit/],
        ['%PARAM={"bar_number":"off"}\n| C |', null],
        ['%PARAM={"bar_number":"on"}\n| C |', null]
      ];
      for (const [index, [text, notice]] of samples.entries()) {
        await page.evaluate(({ text, revision }) => {
          document.getElementById('status').dataset.state = 'waiting';
          window.dispatchEvent(new MessageEvent('message', { data: { type: 'render', uri: 'file:///score.fumen', text, revision } }));
        }, { text, revision: index });
        await page.waitForFunction(() => ['rendered', 'error'].includes(document.getElementById('status').dataset.state));
        assert.equal(await page.locator('#status').getAttribute('data-state'), 'rendered', await page.locator('#status').innerText());
        assert.ok(await page.locator('#print').isEnabled());
        const message = await page.locator('#status').innerText();
        if (notice) assert.match(message, notice);
        else assert.equal(message, language === 'ja' ? '1 ページ · Fumen 1.3.3' : 'Pages: 1 · Fumen 1.3.3');
      }
    } finally { await page.close(); }
  }
});
