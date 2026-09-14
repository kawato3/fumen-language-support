export interface WhitespaceEdit { start: number; end: number; text: string }

/** Conservative whitespace edits, with offsets in UTF-16 (as used by VS Code).
 * Fumen's line breaks, commas and quoted/label text are notation, not whitespace.
 * Redundant blank lines may be removed, but one blank line remains a block boundary.
 * This is deliberately not a parser, chord normalizer or column-alignment tool.
 */
export function formattingEdits(source: string): WhitespaceEdit[] {
  if (source.length > 500_000) return [];
  const edits: WhitespaceEdit[] = [];
  const replace = (start: number, end: number, text: string): void => {
    if (source.slice(start, end) !== text) edits.push({ start, end, text });
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
      const line = source.slice(start, cursor);
      const setting = /^%([ \t]*)([A-Za-z_][A-Za-z_0-9]*)([ \t]*)=([ \t]*)/.exec(line);
      if (setting) {
        const [prefix, afterPercent = '', name = '', beforeEquals = '', afterEquals = ''] = setting;
        const valueStart = start + prefix.length;
        let valueEnd = cursor;
        while (valueEnd > valueStart && /[ \t]/.test(source.charAt(valueEnd - 1))) --valueEnd;
        try {
          JSON.parse(source.slice(valueStart, valueEnd));
          let offset = start + 1;
          replace(offset, offset + afterPercent.length, '');
          offset += afterPercent.length + name.length;
          replace(offset, offset + beforeEquals.length, '');
          offset += beforeEquals.length + 1;
          replace(offset, offset + afterEquals.length, '');
          replace(valueEnd, cursor, '');
        } catch {
          // Incomplete or invalid JSON stays byte-for-byte unchanged.
        }
      }
    }
    previousEnd = cursor;
    previousBar = Boolean(boundary);
    lineHasToken = true;
    endsWithContinuation = char === '\\';
  }
  replace(previousEnd, cursor, '');
  return edits;
}
