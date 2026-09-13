import { MAX_PREVIEW_LENGTH, PreviewInput, PreviewStatus } from '../preview-protocol.js';
import { RenderQueue } from './render-queue.js';
import { CanvasBudget, checkLayout } from './layout-safety.js';
import { MeasurementCacheBudget } from './measurement-budget.js';
import { createTranslator } from '../localization.js';

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): SavedState | undefined;
  setState(state: SavedState): void;
};
interface Track { childNodes?: Track[]; name?: string; value?: unknown; getVariable(name: string): unknown }
declare const Fumen: {
  Parser: new (error: (message: string) => void) => { parse(text: string): Track | null };
  DefaultRenderer: new (provider: () => HTMLCanvasElement, options: object) => { render(track: Track): Promise<unknown> };
};
interface SavedState { uri: string; zoom: number | 'fit'; top: number; left: number; lastGood?: string }
type Input = PreviewInput & { error?: string };

const vscode = acquireVsCodeApi();
// Only extension-owned translations cross this boundary, never score text or executable code.
const t = createTranslator(JSON.parse(document.body.dataset.l10n || '{}'));
const measurementBudget = new MeasurementCacheBudget(t);
const viewport = document.getElementById('viewport')!;
const pages = document.getElementById('pages')!;
const status = document.getElementById('status')!;
const fit = document.getElementById('fit')!;
const zoomLabel = document.getElementById('zoom')!;
const previous = vscode.getState();
let saved: SavedState = previous && typeof previous.uri === 'string'
  ? { ...previous, zoom: previous.zoom === 'fit' ? 'fit' : clampZoom(previous.zoom), top: previous.top || 0, left: previous.left || 0 }
  : { uri: '', zoom: 'fit', top: 0, left: 0 };
let latestRevision = -1;
let submittedRevision = -1;
let actualZoom = 1;
let restoringScroll = false;

function clampZoom(value: number): number { return Number.isFinite(value) ? Math.max(0.25, Math.min(2, value)) : 1; }
function canvases(): HTMLCanvasElement[] { return [...pages.querySelectorAll('canvas')]; }
function persist(): void { vscode.setState(saved); }
function release(container: HTMLElement): void {
  for (const canvas of container.querySelectorAll('canvas')) { canvas.width = 0; canvas.height = 0; }
  container.replaceChildren();
}
function report(input: PreviewInput, state: PreviewStatus['state'], message: string): void {
  status.textContent = message;
  status.dataset.state = state;
  vscode.postMessage({ type: 'status', uri: input.uri, revision: input.revision, state, pages: pages.childElementCount, message } satisfies PreviewStatus);
}
function adoptUri(uri: string): void {
  if (saved.uri === uri) return;
  release(pages);
  saved = { uri, zoom: saved.zoom, top: 0, left: 0 };
  submittedRevision = -1;
  persist();
}
function layout(): void {
  const list = canvases();
  if (!list.length) return;
  const width = Math.max(...list.map(canvas => Number(canvas.dataset.width)));
  actualZoom = saved.zoom === 'fit' ? Math.min(2, Math.max(0.1, (viewport.clientWidth - 32) / width)) : saved.zoom;
  for (const canvas of list) {
    canvas.style.width = `${Number(canvas.dataset.width) * actualZoom}px`;
    canvas.style.height = `${Number(canvas.dataset.height) * actualZoom}px`;
  }
  fit.setAttribute('aria-pressed', String(saved.zoom === 'fit'));
  zoomLabel.textContent = `${Math.round(actualZoom * 100)}%`;
}
function replacePages(container: HTMLElement): void {
  // Keep explicit scroll state while the temporary empty layout is swapped out.
  const top = saved.top, left = saved.left;
  restoringScroll = true;
  release(pages);
  pages.append(...container.childNodes);
  layout();
  viewport.scrollTop = top;
  viewport.scrollLeft = left;
  requestAnimationFrame(() => { restoringScroll = false; });
}

async function renderScore(text: string, current: () => boolean): Promise<HTMLElement> {
  if (typeof Fumen === 'undefined') throw new Error(t("Could not load the rendering library. Try Reload."));
  let parseError = '';
  const track = new Fumen.Parser(message => { parseError = message; }).parse(text);
  if (!track) throw new Error(parseError || t("Fumen could not parse this notation."));
  checkLayout(track, t);
  measurementBudget.reserve(track.getVariable('PARAM'), window.devicePixelRatio || 1);
  const container = document.createElement('div');
  const budget = new CanvasBudget(undefined, t);
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const renderer = new Fumen.DefaultRenderer(() => {
      if (cancelled || !current()) throw new Error('Superseded render');
      if (container.childElementCount >= 100) throw new Error(t("The preview supports up to 100 pages. Split the score into smaller files."));
      const canvas = document.createElement('canvas');
      // Only instrument canvases supplied to Fumen; never modify the browser's global prototype.
      for (const dimension of ['width', 'height'] as const) {
        const native = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, dimension)!;
        Object.defineProperty(canvas, dimension, {
          get: () => native.get!.call(canvas) as number,
          set: (value: number) => {
            budget.resize(canvas, dimension === 'width' ? value : canvas.width, dimension === 'height' ? value : canvas.height);
            native.set!.call(canvas, value);
          }
        });
      }
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', t('Score page {0}. The content is available in the source text.', container.childElementCount + 1));
      container.append(canvas);
      return canvas;
    }, { preset: 'A4' });
    await Promise.race([
      renderer.render(track),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(t("Rendering did not finish. Try Reload."))), 15_000); })
    ]);
    for (const canvas of container.querySelectorAll('canvas')) {
      const width = parseFloat(canvas.style.width), height = parseFloat(canvas.style.height);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width > 8192 || height > 16384) {
        throw new Error(t("This paper size cannot be previewed. Check the dimensions in %PARAM."));
      }
      canvas.dataset.width = String(width);
      canvas.dataset.height = String(height);
    }
    return container;
  } catch (error) {
    cancelled = true;
    release(container);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const queue = new RenderQueue<Input, HTMLElement>({
  async render(input, current) {
    // Webview contexts are discarded when hidden. Restore the last valid image from local state.
    if (!pages.childElementCount && saved.lastGood && saved.lastGood !== input.text) {
      try {
        const restored = await renderScore(saved.lastGood, current);
        if (current()) replacePages(restored); else release(restored);
      } catch { /* The current source remains authoritative even if an old image cannot be restored. */ }
    }
    if (!current()) throw new Error('Superseded render');
    if (input.error) throw new Error(input.error);
    if (input.text.length > MAX_PREVIEW_LENGTH) throw new Error(t("The preview supports up to 100,000 characters."));
    if (!input.text.trim()) return document.createElement('div');
    report(input, 'rendering', t("Updating…"));
    return renderScore(input.text, current);
  },
  success(input, container) {
    replacePages(container);
    saved.lastGood = input.text;
    persist();
    report(input, pages.childElementCount ? 'rendered' : 'empty', pages.childElementCount
      ? t('Pages: {0} · Fumen 1.3.3', pages.childElementCount) : t("Enter a score to see its preview here."));
  },
  failure(input, error) {
    const detail = (error instanceof Error ? error.message : String(error)).slice(0, 350);
    report(input, 'error', pages.childElementCount
      ? t('Could not update; keeping the previous preview. {0}', detail)
      : t('Cannot display the preview yet. {0}', detail));
  },
  release
});

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (!event.data || typeof event.data !== 'object') return;
  const message = event.data as Partial<Omit<Input, 'type'>> & { type?: string };
  if ((message.type !== 'render' && message.type !== 'pending')
    || typeof message.uri !== 'string' || !Number.isSafeInteger(message.revision)) return;
  if (message.revision! < latestRevision) return;
  latestRevision = message.revision!;
  adoptUri(message.uri);
  if (message.type === 'pending') {
    queue.invalidate();
    report(message as Input, 'rendering', t("Waiting for edits…"));
  } else if (typeof message.text === 'string' && message.revision !== submittedRevision) {
    submittedRevision = message.revision!;
    queue.submit(message as Input);
  }
});

function setZoom(value: number | 'fit'): void {
  const oldZoom = actualZoom;
  saved.zoom = value;
  layout();
  viewport.scrollTop *= actualZoom / oldZoom;
  viewport.scrollLeft *= actualZoom / oldZoom;
  saved.top = viewport.scrollTop;
  saved.left = viewport.scrollLeft;
  persist();
}
document.getElementById('zoom-out')!.addEventListener('click', () => setZoom(clampZoom(Math.round((actualZoom - 0.1) * 100) / 100)));
document.getElementById('zoom-in')!.addEventListener('click', () => setZoom(clampZoom(Math.round((actualZoom + 0.1) * 100) / 100)));
fit.addEventListener('click', () => setZoom('fit'));
document.getElementById('refresh')!.addEventListener('click', () => vscode.postMessage({ type: 'refresh' }));
viewport.addEventListener('scroll', () => {
  if (restoringScroll) return;
  saved.top = viewport.scrollTop;
  saved.left = viewport.scrollLeft;
  persist();
}, { passive: true });
new ResizeObserver(layout).observe(viewport);
window.addEventListener('pagehide', () => queue.dispose());
vscode.postMessage({ type: 'ready' });
