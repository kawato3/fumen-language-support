import { CanvasBudget, checkLayout } from './layout-safety.js';
import { MeasurementCacheBudget } from './measurement-budget.js';
import { Translator } from '../localization.js';

interface Track { childNodes?: Track[]; name?: string; value?: unknown; getVariable(name: string): unknown }
declare const Fumen: {
  Parser: new (error: (message: string) => void) => { parse(text: string): Track | null };
  DefaultRenderer: new (provider: () => HTMLCanvasElement, options: object) => { render(track: Track): Promise<unknown> };
};

export function releasePages(container: HTMLElement): void {
  for (const canvas of container.querySelectorAll('canvas')) { canvas.width = 0; canvas.height = 0; }
  container.replaceChildren();
}

/** One instance per browser context, matching the lifetime of Fumen's measurement cache. */
export class ScoreRenderer {
  private readonly measurementBudget: MeasurementCacheBudget;
  constructor(private readonly t: Translator) { this.measurementBudget = new MeasurementCacheBudget(t); }

  async render(text: string, current: () => boolean = () => true,
    createCanvas: () => HTMLCanvasElement = () => document.createElement('canvas')): Promise<HTMLElement> {
    const t = this.t;
    if (typeof Fumen === 'undefined') throw new Error(t('Could not load the rendering library. Try Reload.'));
    let parseError = '';
    const track = new Fumen.Parser(message => { parseError = message; }).parse(text);
    if (!track) throw new Error(parseError || t('Fumen could not parse this notation.'));
    checkLayout(track, t);
    this.measurementBudget.reserve(track.getVariable('PARAM'), window.devicePixelRatio || 1);
    const container = document.createElement('div');
    const budget = new CanvasBudget(undefined, t);
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const renderer = new Fumen.DefaultRenderer(() => {
        if (cancelled || !current()) throw new Error('Superseded render');
        if (container.childElementCount >= 100) throw new Error(t('The preview supports up to 100 pages. Split the score into smaller files.'));
        const canvas = createCanvas();
        for (const dimension of ['width', 'height'] as const) {
          // Preserve a recorder's reset hook, if present; never patch a global prototype.
          const native = Object.getOwnPropertyDescriptor(canvas, dimension)
            ?? Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, dimension)!;
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
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(t('Rendering did not finish. Try Reload.'))), 15_000); })
      ]);
      for (const canvas of container.querySelectorAll('canvas')) {
        const width = parseFloat(canvas.style.width), height = parseFloat(canvas.style.height);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width > 8192 || height > 16384) {
          throw new Error(t('This paper size cannot be previewed. Check the dimensions in %PARAM.'));
        }
        canvas.dataset.width = String(width);
        canvas.dataset.height = String(height);
      }
      return container;
    } catch (error) {
      cancelled = true;
      releasePages(container);
      throw error;
    } finally { clearTimeout(timer); }
  }
}
