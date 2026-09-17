const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { findChrome } = require('../../build/extension/print-platform');

const defaults = { minor_label: '–', major_label: 'Δ', diminished_label: 'O', half_diminished_label: 'Ø', augmented_label: '+' };
const labels = { minor_label: 'min', major_label: 'maj', diminished_label: 'dim', half_diminished_label: 'm7-5', augmented_label: 'aug' };
let browser;

before(async () => {
  const executablePath = await findChrome(process.env.FUMEN_CHROME_PATH || '');
  assert.ok(executablePath, 'Install Google Chrome or set FUMEN_CHROME_PATH');
  browser = await chromium.launch({ executablePath, headless: true });
});
after(async () => { await browser?.close(); });

// Observe actual score-canvas text after the real renderer has finished. Do not
// compare engraving pixels, mock Canvas metrics, or capture measurement canvases.
async function render(source, parameters = {}) {
  const page = await browser.newPage();
  try {
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.route(/^https?:/, route => { errors.push('Unexpected network request'); return route.abort(); });
    await page.addScriptTag({ path: path.resolve('resources/vendor/fumen.js') });
    const result = await page.evaluate(async ({ source, parameters }) => {
      const calls = [];
      const images = [];
      const widths = [];
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
        if (this.canvas.dataset.score) calls.push({ text: String(text), x, y,
          fontSize: Number(/([\d.]+)px/.exec(this.font)[1]), maxWidth: maxWidth ?? null,
          naturalWidth: this.measureText(text).width });
        return original.apply(this, arguments);
      };
      const drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function (image, x, y, width, height) {
        if (this.canvas.dataset.score) images.push({ x, y, width, height });
        return drawImage.apply(this, arguments);
      };
      const track = new Fumen.Parser().parse('%SHOW_FOOTER="NO"\n%PARAM=' + JSON.stringify(parameters) + '\n' + source);
      if (!track) throw new Error('Invalid test score');
      const renderer = new Fumen.DefaultRenderer(() => {
        const canvas = document.createElement('canvas');
        canvas.dataset.score = 'true';
        document.body.append(canvas);
        return canvas;
      }, { preset: 'A4' });
      // Observe both passes without replacing the renderer or its text metrics.
      const renderChord = renderer.renderChord;
      renderer.renderChord = function (draw) {
        const result = renderChord.apply(this, arguments);
        widths.push({ draw, width: result.width });
        return result;
      };
      await renderer.render(track);
      return { calls, images, widths };
    }, { source, parameters });
    assert.deepEqual(errors, []);
    return result;
  } finally {
    await page.close();
  }
}

for (const style of ['compact', 'inline']) {
  test(`${style}: defaults and invalid label types preserve existing symbols`, async () => {
    const source = '| Cm | CM | Cdim7 | Cm7-5 | Caug | C+ |';
    const baseline = await render(source, { chord_suffix_style: style });
    for (const value of [defaults, ...[null, 1, false, [], {}].map(value =>
      Object.fromEntries(Object.keys(defaults).map(key => [key, value])))]) {
      const actual = await render(source, { ...value, chord_suffix_style: style });
      assert.deepEqual(actual, baseline);
    }
    for (const text of Object.values(defaults)) assert.ok(baseline.calls.some(call => call.text === text), text);
  });

  test(`${style}: each chord quality uses its configured label, independently of input spelling`, async () => {
    for (const [chord, expected] of [
      ['Cdim', ['C', 'dim']], ['Cdim7', ['C', 'dim', '7']],
      ['Cm7-5', ['C', 'm7-5']], ['Cm7b5', ['C', 'm7-5']], ['Cmin7-5', ['C', 'm7-5']],
      ['Caug', ['C', 'aug']], ['C+', ['C', 'aug']],
      ['Caug7', style === 'inline' ? ['C', 'aug', '7'] : ['C', '7', 'aug']],
      ['C+7', style === 'inline' ? ['C', 'aug', '7'] : ['C', '7', 'aug']],
      ['Cm', ['C', 'min']], ['CM7', ['C', 'maj', '7']],
      ['C7-5', ['C', '7', '-5']], ['C7+5', ['C', '7', '+5']]
    ]) {
      const { calls } = await render(`| ${chord} |`, { ...labels, chord_suffix_style: style });
      assert.deepEqual(calls.map(call => call.text), expected, chord);
      const root = calls[0];
      for (const call of calls.slice(1)) {
        assert.equal(call.fontSize, root.fontSize * (style === 'inline' ? 1 : 0.5), chord);
        if (style === 'inline') assert.equal(call.y, root.y, chord);
        if (Object.values(labels).includes(call.text)) assert.equal(call.maxWidth, null,
          'Multi-character labels must not be squeezed into a single-symbol width');
      }
    }
  });

  test(`${style}: suffixes, slash basses and transposition survive a half-diminished label`, async () => {
    const { calls } = await render('%KEY="C"\n%TRANSPOSE=2\n| Cm7-5add9/G:4 |', {
      ...labels, chord_suffix_style: style
    });
    assert.deepEqual(calls.map(call => call.text), ['D', 'm7-5', 'add9', '/A']);
    const altered = await render('| Cm7-5(b9)/G |', { ...labels, chord_suffix_style: style });
    assert.deepEqual(altered.calls.map(call => call.text), ['C', 'm7-5', '(', '9', ')', '/G']);
  });

  test(`${style}: empty labels remain intentional and do not fall back to symbols`, async () => {
    const empty = Object.fromEntries(Object.keys(defaults).map(key => [key, '']));
    const { calls } = await render('| Cm | CM | Cdim | Cm7-5 | Caug |', { ...empty, chord_suffix_style: style });
    assert.deepEqual(calls.map(call => call.text), ['C', '', 'C', '', 'C', '', 'C', '', 'C', '']);
    assert.ok(calls.filter(call => call.text === '').every(call => call.naturalWidth === 0));
  });

  test(`${style}: layout measurement and drawing agree for labels, accidentals and slash basses`, async () => {
    for (const bassStyle of ['right', 'below']) {
      const { widths } = await render('| C#dim7/Gb | Dbm7-5add9/Ab | F#aug7 | BbmM7 | /G |', {
        ...labels, chord_suffix_style: style, on_bass_style: bassStyle
      });
      const measured = widths.filter(call => !call.draw).map(call => call.width);
      const drawn = widths.filter(call => call.draw).map(call => call.width);
      assert.equal(measured.length, 5, 'All five chords must be measured');
      assert.deepEqual(drawn, measured, `on_bass_style=${bassStyle}`);
      assert.ok(measured.every(width => Number.isFinite(width) && width > 0));
    }
  });
}

test('label settings remain local to their setting scope', async () => {
  const { calls } = await render('| Cdim |\n%PARAM={"diminished_label":"dim"}\n| Cdim |\n%PARAM={}\n| Cdim |');
  assert.deepEqual(calls.map(call => call.text), ['C', 'O', 'C', 'dim', 'C', 'O']);
});

test('inline suffixes start after the complete root, including its accidental', async () => {
  for (const chord of ['C#dim7', 'Dbm7-5', 'F#aug', 'GbM7', 'Bb7', 'C#/G']) {
    const { calls, images } = await render(`| ${chord} |`, { ...labels, chord_suffix_style: 'inline' });
    const rootAccidental = images[0];
    assert.ok(rootAccidental, `${chord}: the root accidental is drawn`);
    assert.ok(calls[1].x >= rootAccidental.x + rootAccidental.width - 0.001,
      `${chord}: suffix at ${calls[1].x} must follow the accidental ending at ${rootAccidental.x + rootAccidental.width}`);
  }
});

test('compact major and minor words retain their natural width just like the other labels', async () => {
  for (const [chord, key, label] of [['Cm7', 'minor_label', 'min'], ['CM7', 'major_label', 'maj']]) {
    const { calls } = await render(`| ${chord} |`, { [key]: label });
    const quality = calls.find(call => call.text === label);
    const seventh = calls.find(call => call.text === '7');
    assert.ok(quality && seventh);
    assert.equal(quality.maxWidth, null, `${key}: multi-character text must not be squeezed`);
    assert.ok(seventh.x >= quality.x + quality.naturalWidth - 0.001, `${key}: following text uses the same measured width`);
  }
});
