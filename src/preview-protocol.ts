export const PREVIEW_DELAY = 300;
export const MAX_PREVIEW_LENGTH = 100_000;

export interface PreviewInput {
  type: 'render';
  uri: string;
  revision: number;
  text: string;
}

export interface PreviewStatus {
  type: 'status';
  uri: string;
  revision: number;
  state: 'rendering' | 'rendered' | 'error' | 'empty';
  pages: number;
  message: string;
}

export function isPreviewStatus(value: unknown): value is PreviewStatus {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<PreviewStatus>;
  return v.type === 'status' && typeof v.uri === 'string' && Number.isSafeInteger(v.revision) && v.revision! >= 0
    && ['rendering', 'rendered', 'error', 'empty'].includes(v.state ?? '')
    && Number.isSafeInteger(v.pages) && v.pages! >= 0 && v.pages! <= 100
    && typeof v.message === 'string' && v.message.length <= 1000;
}
