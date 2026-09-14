const assert = require('node:assert/strict');
const {test, before, after} = require('node:test');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL} = require('node:url');
const {randomBytes} = require('node:crypto');
const {chromium} = require('playwright-core');
const {build} = require('esbuild');
const {printHtml} = require('../../out/print-html');
const {createTranslator} = require('../../out/localization');
const {findChrome} = require('../../out/print-platform');

const score = '%TITLE="Print test"\n%SHOW_STAFF="YES"\n[A]\n||: (4/4) `青い空を見上げて`@ C:2 r:2 | `We walk beneath the open sky`@ G7:1 :||';
let browser, temporary, assets, japanese;

before(async () => {
  const executablePath = await findChrome(process.env.FUMEN_CHROME_PATH || '');
  assert.ok(executablePath, 'Install Google Chrome or set FUMEN_CHROME_PATH; no browser is downloaded by this suite');
  temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'fumen-print-browser-test-'));
  const read = filename => fs.readFile(path.resolve(filename), 'utf8');
  assets = { library: await read('media/vendor/fumen.js'), script: await read('media/compiled/print.js'),
    style: await read('media/print.css'), notices: await read('media/vendor/FUMEN-LICENSE.txt'), nonce: randomBytes(18).toString('base64') };
  japanese = JSON.parse(await read('l10n/bundle.l10n.ja.json'));
  browser = await chromium.launch({executablePath, headless: true});
});
after(async () => { await browser?.close(); if (temporary) await fs.rm(temporary, {recursive: true, force: true}); });

async function open(t, text, language = 'en', options = {}) {
  const context = await browser.newContext({viewport: {width: 1000, height: 1000}, ...options});
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [], network = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => { if (/^https?:/.test(request.url())) network.push(request.url()); });
  const bundle = language === 'ja' ? japanese : {};
  const filename = path.join(temporary, randomBytes(8).toString('hex') + '.html');
  await fs.writeFile(filename, printHtml({text, name: 'snapshot.fumen'}, assets, createTranslator(bundle), language, bundle));
  await page.goto(pathToFileURL(filename).href);
  await page.waitForFunction(() => document.body.dataset.state !== 'loading');
  t.after(() => { assert.deepEqual(errors, []); assert.deepEqual(network, [], 'Score rendering requires no network requests'); });
  return page;
}

for (const language of ['en', 'ja']) test(`offline print page renders with strict CSP and ${language} controls; replay is exact and repeatable`, async t => {
  const page = await open(t, score, language);
  assert.equal(await page.locator('body').getAttribute('data-state'), 'ready', await page.locator('#status').innerText());
  assert.equal(await page.locator('#print').innerText(), language === 'ja' ? '印刷 / PDF に保存' : 'Print / Save as PDF');
  const original = await page.locator('canvas').evaluateAll(canvases => canvases.map(c => c.toDataURL()));
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => { window.dispatchEvent(new Event('beforeprint')); window.dispatchEvent(new Event('afterprint')); });
    assert.equal(await page.locator('body').getAttribute('data-state'), 'ready');
    assert.deepEqual(await page.locator('canvas').evaluateAll(canvases => canvases.map(c => c.toDataURL())), original,
      'The adapter must reproduce the existing render, not test Fumen engraving');
  }
});

test('parse errors, blank scores and allocation limits disable printing and leave no old pages', async t => {
  for (const input of ['[unfinished', '   ', '%PARAM={"paper_width":1000000000}\n' + score]) {
    const page = await open(t, input);
    assert.equal(await page.locator('body').getAttribute('data-state'), 'error');
    assert.ok(await page.locator('#print').isDisabled());
    assert.equal(await page.locator('#pages canvas').count(), 0);
  }
});

test('HTML-looking title and lyrics stay inert, with no network or injected nodes', async t => {
  const page = await open(t, score.replace('Print test', '</script><script>window.injected=true</script>'));
  assert.equal(await page.locator('body').getAttribute('data-state'), 'ready');
  assert.equal(await page.evaluate(() => window.injected), undefined);
  assert.equal(await page.locator('script').count(), 3);
});

test('custom page dimensions fit without clipping or aspect-ratio distortion', async t => {
  const page = await open(t, '%PARAM={"paper_width":1200,"paper_height":900}\n' + score);
  assert.equal(await page.locator('body').getAttribute('data-state'), 'ready', await page.locator('#status').innerText());
  const size = await page.locator('canvas').first().evaluate(c => ({width: parseFloat(c.style.width), height: parseFloat(c.style.height), ratio: Number(c.dataset.width) / Number(c.dataset.height)}));
  assert.ok(size.width <= 210 && size.height <= 297);
  assert.ok(Math.abs(size.width / size.height - size.ratio) < 0.0001);
});

test('bundled notation and multiple pages replay without changing any rendered page', async t => {
  const notation = await fs.readFile('examples/notation-en.fumen', 'utf8');
  const page = await open(t, notation + Array.from({length: 14}, (_, i) => `\n\n[Section ${i + 1}]\n| C:2 G7:2 | Am7:1 |\n| F:2 G7:2 | C:1 |`).join(''));
  assert.equal(await page.locator('body').getAttribute('data-state'), 'ready', await page.locator('#status').innerText());
  const original = await page.locator('canvas').evaluateAll(cs => cs.map(c => c.toDataURL()));
  assert.ok(original.length > 1);
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  assert.deepEqual(await page.locator('canvas').evaluateAll(cs => cs.map(c => c.toDataURL())), original);
});

test('unsupported browsers show a useful error instead of promising vector output', async t => {
  const page = await open(t, score, 'en', {userAgent: 'Mozilla/5.0 Safari/605.1.15'});
  assert.equal(await page.locator('body').getAttribute('data-state'), 'error');
  assert.match(await page.locator('#status').innerText(), /Google Chrome/);
});

test('recorder observes native resets, freezes finished drawings and rejects unsupported operations', async t => {
  const context = await browser.newContext(); t.after(() => context.close());
  const page = await context.newPage();
  const bundle = await build({entryPoints: ['src/webview/canvas-recording.ts'], bundle: true, platform: 'browser', format: 'iife', globalName: 'RecordingTest', write: false});
  await page.setContent('<canvas width="80" height="80"></canvas>');
  await page.addScriptTag({content: bundle.outputFiles[0].text});
  const result = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const budget = new RecordingTest.RecordingBudget(undefined, 4);
    const record = new RecordingTest.CanvasRecording(canvas, budget);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 80, 80);
    canvas.width = 80;
    ctx.fillStyle = 'blue'; ctx.fillRect(3, 4, 12, 16);
    const original = canvas.toDataURL();
    record.seal(); record.replay(); record.replay();
    const equal = original === canvas.toDataURL();
    let frozen = false, unsupported = false, disposed = false, cumulativeLimit = false;
    try { budget.reserve([]); } catch { cumulativeLimit = true; }
    try { ctx.fillRect(0, 0, 1, 1); } catch { frozen = true; }
    try { ctx.filter = 'blur(1px)'; } catch { unsupported = true; }
    record.dispose();
    try { record.replay(); } catch { disposed = true; }
    return {equal, frozen, unsupported, disposed, cumulativeLimit};
  });
  assert.deepEqual(result, {equal: true, frozen: true, unsupported: true, disposed: true, cumulativeLimit: true});
});
