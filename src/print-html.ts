import { displayLanguage, english, TranslationBundle, Translator } from './localization';
import { MAX_PREVIEW_LENGTH } from './preview-protocol';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export function printHtml(input: { text: string; name: string }, assets: { library: string; script: string; style: string; notices: string; nonce: string },
  t: Translator = english, language = 'en', bundle: TranslationBundle = {}): string {
  if (input.text.length > MAX_PREVIEW_LENGTH) throw new Error(t('The preview supports up to 100,000 characters. Split the score into smaller files.'));
  const nonce = escape(assets.nonce);
  const json = JSON.stringify({ ...input, bundle }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const dataScript = (source: string) => `data:text/javascript;base64,${Buffer.from(source, 'utf8').toString('base64')}`;
  return `<!DOCTYPE html>
<html lang="${displayLanguage(language)}"><head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; img-src data:; base-uri 'none'; form-action 'none';">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(t('Print: {0}', input.name))}</title>
<style nonce="${nonce}">${assets.style}</style>
</head><body data-state="loading">
<header class="controls">
  <h1>${escape(t('Print: {0}', input.name))}</h1>
  <p>${escape(t('This is a snapshot. After editing the score, reopen the print view from VS Code.'))}</p>
  <p>${escape(t('In Chrome, choose Save as PDF, turn off headers and footers, and use no margins. Text and notation remain vector-based where Chrome supports it.'))}</p>
  <button type="button" id="print" disabled>${escape(t('Print / Save as PDF'))}</button>
  <p class="note">${escape(t('The temporary file is removed when the extension closes. Save the PDF to keep it.'))}</p>
</header>
<p id="status" role="status" aria-live="polite">${escape(t('Preparing print view…'))}</p>
<main id="pages" aria-label="${escape(t('Score preview. The score content is available in the source text.'))}"></main>
<details class="controls"><summary>${escape(t('Third-party notices'))}</summary><pre>${escape(assets.notices)}</pre></details>
<script id="input" type="application/json" nonce="${nonce}">${json}</script>
<script nonce="${nonce}" src="${dataScript(assets.library)}"></script>
<script nonce="${nonce}" src="${dataScript(assets.script)}"></script>
</body></html>`;
}
