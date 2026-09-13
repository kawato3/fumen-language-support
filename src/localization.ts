/** Shared by the pure language helpers and the webview; the host uses vscode.l10n.t. */
export type Translator = (message: string, ...args: (string | number)[]) => string;
export type TranslationBundle = Record<string, string | { message: string }>;

export function createTranslator(bundle: TranslationBundle = {}): Translator {
  return (message, ...args) => {
    const entry = Object.prototype.hasOwnProperty.call(bundle, message) ? bundle[message] : undefined;
    const translated = typeof entry === 'string' ? entry : entry?.message ?? message;
    return translated.replace(/\{(\d+)\}/g, (placeholder, index: string) => String(args[Number(index)] ?? placeholder));
  };
}

export const english = createTranslator();

/** Follow the editor's display language, never the OS locale or the score's contents. */
export function displayLanguage(language: string): 'en' | 'ja' {
  return /^ja(?:-|$)/i.test(language) ? 'ja' : 'en';
}

export function helpFile(name: 'CHEATSHEET' | 'QUICKSTART', language: string): string {
  return `${name}${displayLanguage(language) === 'ja' ? '.ja' : ''}.md`;
}
