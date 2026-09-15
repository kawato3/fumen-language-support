// Generate the documentation comparison from the renderer bundled in this repository.
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { findChrome } = require('../out/print-platform');

const output = path.resolve(__dirname, '../media/screenshots/chord-display-modes.png');
const library = path.resolve(__dirname, '../media/vendor/fumen.js');
const score = '| Am7(#11)/C | AM7/E |';
const source = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f6f8fa; color: #1f2328; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  main { width: 1600px; padding: 72px 80px 76px; }
  h1 { margin: 0; font-size: 44px; letter-spacing: -0.5px; }
  .intro { margin: 15px 0 42px; color: #57606a; font-size: 22px; }
  .comparison { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  article { overflow: hidden; background: #fff; border: 1px solid #d0d7de; border-radius: 18px; box-shadow: 0 2px 7px #1f232814; }
  .heading { min-height: 154px; padding: 28px 34px 22px; border-bottom: 1px solid #d8dee4; }
  h2 { margin: 0; font-size: 26px; }
  .heading p { margin: 10px 0 0; color: #57606a; font-size: 18px; line-height: 1.45; }
  code { padding: 2px 6px; border-radius: 5px; background: #eff2f5; color: #24292f; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
  .notation { margin: 0; padding: 22px 34px; border-bottom: 1px solid #d8dee4; background: #f8fafc; color: #24292f; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 20px; white-space: pre-wrap; }
  .inline .notation { font-size: 16px; line-height: 1.35; overflow-wrap: anywhere; }
  .score { height: 260px; overflow: hidden; padding: 22px 18px 0; background: #fff; }
  .score canvas { display: block; width: 100%; height: auto; }
  .inline .heading { border-top: 6px solid #0969da; padding-top: 22px; }
  .compact .heading { border-top: 6px solid #6e7781; padding-top: 22px; }
</style></head><body><main>
  <h1>Chord component display</h1>
  <p class="intro">The same chord input, rendered by the bundled Fumen renderer.</p>
  <section class="comparison">
    <article class="compact"><div class="heading"><h2>Default Fumen compact layout</h2><p>No extension-specific chord-display values. Components after the root are smaller and arranged above or below it.</p></div><p class="notation">${score}</p><div id="compact" class="score"></div></article>
    <article class="inline"><div class="heading"><h2>Extension-specific inline layout</h2><p><code>m</code>, <code>M</code> and all following components use ordinary size on one baseline.</p></div><p class="notation">%PARAM={"minor_label":"m","major_label":"M","chord_suffix_style":"inline"}\n${score}</p><div id="inline" class="score"></div></article>
  </section>
</main></body></html>`;

async function render(page, id, text) {
  await page.evaluate(async ({ id, text }) => {
    const track = new Fumen.Parser(() => {}).parse(text);
    if (!track) throw new Error('The documentation sample did not parse.');
    const target = document.getElementById(id);
    const renderer = new Fumen.DefaultRenderer(() => {
      const canvas = document.createElement('canvas');
      target.append(canvas);
      return canvas;
    }, { preset: 'A4' });
    await renderer.render(track);
  }, { id, text });
}

async function main() {
  const executablePath = await findChrome(process.env.FUMEN_CHROME_PATH || '');
  if (!executablePath) throw new Error('Install Google Chrome or set FUMEN_CHROME_PATH to generate the comparison image.');
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    await page.setContent(source);
    await page.addScriptTag({ content: await fs.readFile(library, 'utf8') });
    await render(page, 'compact', score);
    await render(page, 'inline', `%PARAM={"minor_label":"m","major_label":"M","chord_suffix_style":"inline"}\n${score}`);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await page.screenshot({ path: output, fullPage: true });
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
