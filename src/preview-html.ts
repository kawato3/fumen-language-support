import { displayLanguage, english, TranslationBundle, Translator } from './localization';

export function previewHtml(resources: { script: string; library: string; style: string; cspSource: string; nonce: string },
  t: Translator = english, language = 'en', bundle: TranslationBundle = {}): string {
  const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  const { script, library, style, cspSource, nonce } = resources;
  return `<!DOCTYPE html>
<html lang="${displayLanguage(language)}">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${escape(nonce)}' ${escape(cspSource)}; style-src ${escape(cspSource)}; img-src data:; base-uri 'none'; form-action 'none';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${escape(style)}">
  <title>${escape(t('Fumen Preview'))}</title>
</head>
<body data-l10n="${escape(JSON.stringify(bundle))}">
  <header>
    <div class="toolbar" role="toolbar" aria-label="${escape(t('Preview controls'))}">
      <button id="zoom-out" type="button" title="${escape(t('Zoom out'))}" aria-label="${escape(t('Zoom out'))}">−</button>
      <button id="zoom-in" type="button" title="${escape(t('Zoom in'))}" aria-label="${escape(t('Zoom in'))}">＋</button>
      <button id="fit" type="button" aria-pressed="true">${escape(t('Fit to Width'))}</button>
      <span id="zoom" aria-live="off"></span>
      <button id="refresh" type="button" title="${escape(t('Reload preview'))}">${escape(t('Reload'))}</button>
    </div>
    <p id="status" role="status" aria-live="polite">${escape(t('Preparing preview…'))}</p>
  </header>
  <main id="viewport" tabindex="0" aria-label="${escape(t('Score preview. The score content is available in the source text.'))}">
    <div id="pages"></div>
  </main>
  <script nonce="${escape(nonce)}" src="${escape(library)}"></script>
  <script nonce="${escape(nonce)}" type="module" src="${escape(script)}"></script>
</body>
</html>`;
}
