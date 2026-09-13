import { english, Translator } from '../localization.js';

const MAXIMUM_PIXELS = 16_000_000;

/**
 * Fumen 1.3.3 retains a 600×600 logical canvas per global ratio/zoom pair.
 * This budget has the same webview lifetime; creating a new renderer does not clear it.
 */
export class MeasurementCacheBudget {
  private readonly pairs = new Set<string>();
  private pixels = 0;

  constructor(private readonly t: Translator = english) {}

  reserve(parameters: unknown, devicePixelRatio = 1): void {
    const t = this.t;
    const param = parameters && typeof parameters === 'object' ? parameters as Record<string, unknown> : {};
    // The pinned A4 preset defaults to an explicit ratio of 2 and text size of 1.
    const ratio = param.pixel_ratio === null ? devicePixelRatio : param.pixel_ratio ?? 2;
    const zoom = param.text_size ?? 1;
    if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio <= 0 || ratio > 3) {
      throw new Error(t('The effective pixel ratio is outside the preview limit. Set %PARAM pixel_ratio to a value between 1 and 3.'));
    }
    const pixels = typeof zoom === 'number' ? Math.ceil(600 * ratio * zoom) ** 2 : Infinity;
    if (!Number.isFinite(pixels) || pixels <= 0 || pixels > MAXIMUM_PIXELS) {
      throw new Error(t('The text-measurement image would be too large. Reduce %PARAM text_size or pixel_ratio.'));
    }
    const key = `${ratio}/${zoom}`;
    if (this.pairs.has(key)) return;
    if (this.pixels + pixels > MAXIMUM_PIXELS) {
      throw new Error(t('The text-measurement cache is full. Close and reopen the preview, or reuse earlier text_size and pixel_ratio values.'));
    }
    this.pairs.add(key);
    this.pixels += pixels;
    // Never release a reservation, even after a failed render: the vendor may have cached it.
  }
}
