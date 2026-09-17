import { MAX_PREVIEW_LENGTH } from '../preview-protocol.js';
import { createTranslator, TranslationBundle } from '../localization.js';
import { CanvasRecording, RecordingBudget } from './canvas-recording.js';
import { releasePages, ScoreRenderer } from './score.js';

const input = JSON.parse(document.getElementById('input')!.textContent!) as { text: string; bundle: TranslationBundle };
const t = createTranslator(input.bundle);
const pages = document.getElementById('pages')!;
const status = document.getElementById('status')!;
const button = document.getElementById('print') as HTMLButtonElement;
const recordings: CanvasRecording[] = [];
let ready = false;
let disposed = false;

function clear(): void {
  ready = false;
  button.disabled = true;
  for (const recording of recordings) recording.dispose();
  recordings.length = 0;
  releasePages(pages);
}

function fail(error: unknown): void {
  clear();
  document.body.dataset.state = 'error';
  const detail = (error instanceof Error ? error.message : String(error)).slice(0, 350);
  status.textContent = t('Cannot print this score. {0}', detail);
}

window.addEventListener('beforeprint', () => {
  if (!ready) {
    fail(t('Wait for the print view to finish loading, or reopen it from VS Code.'));
    return;
  }
  try {
    // Chrome snapshots before async Fumen rendering finishes. Replay MUST remain synchronous.
    for (const recording of recordings) recording.replay();
  } catch (error) { fail(error); }
});
button.addEventListener('click', () => { if (ready) window.print(); });
window.addEventListener('pagehide', () => { disposed = true; clear(); });
// A restored bfcache document no longer owns its native drawing records.
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });

async function prepare(): Promise<void> {
  if (!/Chrome\//.test(navigator.userAgent) || /Edg\/|OPR\//.test(navigator.userAgent)) {
    throw new Error(t('Open this print view in Google Chrome. Other browsers are not supported for vector printing.'));
  }
  if (typeof input.text !== 'string' || input.text.length > MAX_PREVIEW_LENGTH) {
    throw new Error(t('The preview supports up to 100,000 characters. Split the score into smaller files.'));
  }
  if (!input.text.trim()) throw new Error(t('The score is empty.'));
  const budget = new RecordingBudget(t);
  const container = await new ScoreRenderer(t).render(input.text, () => !disposed, () => {
    const canvas = document.createElement('canvas');
    recordings.push(new CanvasRecording(canvas, budget, t));
    return canvas;
  });
  await document.fonts.ready;
  if (disposed || document.body.dataset.state === 'error') { releasePages(container); return; }
  if (!container.childElementCount) throw new Error(t('The score is empty.'));
  for (const canvas of [...container.querySelectorAll('canvas')]) {
    const width = Number(canvas.dataset.width), height = Number(canvas.dataset.height);
    // Preserve every Fumen page's aspect ratio, fitting custom sizes inside A4 without cropping.
    const scale = Math.min(210 / width, 297 / height);
    canvas.style.width = `${width * scale}mm`;
    canvas.style.height = `${height * scale}mm`;
    const sheet = document.createElement('section');
    sheet.className = 'sheet';
    sheet.append(canvas);
    pages.append(sheet);
  }
  for (const recording of recordings) recording.seal();
  ready = true;
  button.disabled = false;
  document.body.dataset.state = 'ready';
  const message = t('Ready to print: {0} pages.', recordings.length);
  status.textContent = container.dataset.notice ? `${message} ${container.dataset.notice}` : message;
}
void prepare().catch(fail);
