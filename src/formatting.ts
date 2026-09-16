import { orderSettings, parseSetting } from './setting-formatting';

export interface FormattingEdit { start: number; end: number; text: string }

/** Conservative formatting edits, with offsets in UTF-16 (as used by VS Code).
 * Fumen's line breaks, commas and quoted/label text are notation, not whitespace.
 * Redundant blank lines may be removed, but one blank line remains a block boundary.
 * This is deliberately not a parser, chord normalizer or column-alignment tool.
 */
export function formattingEdits(source: string): FormattingEdit[] {
  if (source.length > 500_000) return [];
  const edits: FormattingEdit[] = [];
  const replace = (start: number, end: number, text: string): void => {
    if (source.slice(start, end) !== text) edits.push({ start, end, text });
  };
  const settings: { start: number; end: number; setting: ReturnType<typeof parseSetting> }[] = [];
  const flushSettings = (): void => {
    if (!settings.length) return;
    const ordered = orderSettings(settings.map(line => line.setting));
    settings.forEach((line, i) => {
      const original = line.setting;
      const target = ordered[i];
      if (!original || !target) return;
      const { afterPercent, name, beforeEquals, afterEquals, valueStart, value } = original;
      let offset = line.start + 1;
      replace(offset, offset + afterPercent.length, '');
      offset += afterPercent.length;
      replace(offset, offset + name.length, target.name);
      offset += name.length;
      replace(offset, offset + beforeEquals.length, '');
      offset += beforeEquals.length + 1;
      replace(offset, offset + afterEquals.length, '');
      replace(line.start + valueStart, line.start + valueStart + value.length, target.value);
      replace(line.start + valueStart + value.length, line.end, '');
    });
    settings.length = 0;
  };
  const bar = /(?:\.\/\|\/\.|:\|\|:?(?:x(?:\d+|X))?|\|\|[.:]?|\|)/y;
  let cursor = 0;
  let previousEnd = 0;
  let previousBar = false;
  let lineHasToken = false;
  let blankLineSeen = false;
  let endsWithContinuation = false;
  let preserveBlankLines = false;

  while (cursor < source.length) {
    const start = cursor;
    const char = source.charAt(cursor);
    if (char === ' ' || char === '\t') {
      ++cursor;
      continue;
    }
    if (char === '\r' || char === '\n') {
      if (!lineHasToken) flushSettings();
      const newlineEnd = cursor + (char === '\r' && source[cursor + 1] === '\n' ? 2 : 1);
      // A backslash consumes its newline without counting it as a row break.
      // Collapsing the following blank lines could therefore merge Fumen blocks.
      if (lineHasToken) preserveBlankLines = endsWithContinuation;
      replace(previousEnd, !lineHasToken && blankLineSeen && !preserveBlankLines ? newlineEnd : cursor, '');
      blankLineSeen = !lineHasToken;
      cursor = newlineEnd;
      previousEnd = cursor;
      previousBar = false;
      lineHasToken = false;
      continue;
    }

    // Only standalone, consecutive setting lines share a sortable run. Using
    // this token scan also protects setting-looking lines inside multiline text.
    if (char !== '%' || lineHasToken) flushSettings();

    bar.lastIndex = cursor;
    const boundary = bar.exec(source);
    if (boundary) {
      cursor = bar.lastIndex;
    } else if (char === '%') {
      // Values are one-line JSON, unlike ordinary Fumen quoted text. Never
      // reserialize them: that would change escapes, number spelling or precision.
      while (cursor < source.length && !/[\r\n]/.test(source.charAt(cursor))) ++cursor;
    } else {
      const alignment = char === '<' && /^[ \t]*(?:\||:\|\||\.\/\|\/\.)/.test(source.slice(cursor + 1));
      const closing = char === '[' ? ']' : char === '(' ? ')' : char === '{' ? '}'
        : char === '<' && !alignment && source[cursor + 1] !== ':' ? '>'
        : /["'`-]/.test(char) ? char : undefined;
      if (closing) {
        const end = source.indexOf(closing, cursor + 1);
        // An unfinished delimiter makes the rest ambiguous. Don't edit this document.
        if (end < 0) return [];
        cursor = end + 1;
      } else {
        ++cursor;
        // Keep contiguous chord/duration spelling intact, including parentheses,
        // slashes and hyphens. Only boundary tokens get newly inserted spaces.
        if (!/[<>\\]/.test(char)) {
          while (cursor < source.length && !/[ \t\r\n|"'`\[\]<>%{}\\]/.test(source.charAt(cursor))) ++cursor;
        }
      }
    }

    if (lineHasToken && (start > previousEnd || boundary || previousBar)) {
      replace(previousEnd, start, ' ');
    }

    if (char === '%') {
      settings.push({ start, end: cursor, setting: parseSetting(source.slice(start, cursor)) });
      if (lineHasToken) flushSettings();
    }
    previousEnd = cursor;
    previousBar = Boolean(boundary);
    lineHasToken = true;
    endsWithContinuation = char === '\\';
  }
  flushSettings();
  replace(previousEnd, cursor, '');
  return edits.sort((a, b) => a.start - b.start);
}
