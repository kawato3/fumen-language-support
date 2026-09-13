import { english, Translator } from '../localization.js';

interface FumenNode { name?: string; value?: unknown; childNodes?: FumenNode[] }

/** Refuse unreasonable canvas allocations without rewriting the author's settings. */
export function checkLayout(track: FumenNode, t: Translator = english): void {
  const limits: Record<string, [number, number]> = {
    paper_width: [100, 2000], paper_height: [0, 3000], text_size: [0.25, 4],
    pixel_ratio: [1, 3], ncol: [1, 8], nrow: [1, 8], row_gen_n_meas: [1, 64]
  };
  const nodes = [track];
  while (nodes.length) {
    const node = nodes.pop()!;
    if (node.name === 'PARAM' && node.value && typeof node.value === 'object') {
      for (const [key, value] of Object.entries(node.value)) {
        const bounds = limits[key] ?? (key.endsWith('_font_size') ? [1, 100] : undefined);
        if (bounds && !(key === 'pixel_ratio' && value === null) && (typeof value !== 'number' || !Number.isFinite(value)
          || value < bounds[0]! || value > bounds[1]!
          || (['ncol', 'nrow', 'row_gen_n_meas'].includes(key) && !Number.isInteger(value)))) {
          throw new Error(t('%PARAM {0} is outside the preview range ({1}–{2}).', key, bounds[0]!, bounds[1]!));
        }
      }
    }
    if (node.childNodes) nodes.push(...node.childNodes);
  }
}

/** Budget backing-store pixels before the browser allocates a page, including content-height pages. */
export class CanvasBudget {
  private readonly sizes = new Map<object, number>();
  private total = 0;
  constructor(private readonly maximumPixels = 32_000_000, private readonly t: Translator = english) {}

  resize(key: object, width: number, height: number): void {
    const t = this.t;
    if (![width, height].every(value => Number.isFinite(value) && value >= 0)
      || width > 8192 || height > 16384) {
      throw new Error(t("The score image dimensions are too large. Adjust %PARAM or split the score."));
    }
    const size = Math.floor(width) * Math.floor(height);
    const next = this.total - (this.sizes.get(key) ?? 0) + size;
    if (next > this.maximumPixels) throw new Error(t("The preview images are too large in total. Split the score into smaller files."));
    this.total = next;
    if (size) this.sizes.set(key, size); else this.sizes.delete(key);
  }
}
