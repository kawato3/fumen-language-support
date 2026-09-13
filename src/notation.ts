import { english, Translator } from './localization';

/** A deliberately small lexical reader, not a musical validator or a Fumen parser. */
export type TokenKind = 'variable' | 'text' | 'section' | 'bracket' | 'time' | 'sign' |
  'bar' | 'alignment' | 'syncopation' | 'word' | 'symbol';

export interface Token {
  kind: TokenKind;
  start: number;
  end: number;
  text: string;
  closed: boolean;
}

export interface Issue {
  start: number;
  end: number;
  code: string;
  message: string;
}

export interface Scan { tokens: Token[]; issues: Issue[] }

export function scan(text: string, t: Translator = english): Scan {
  const tokens: Token[] = [];
  const issues: Issue[] = [];
  let offset = 0;
  let lineHead = true;
  const push = (kind: TokenKind, end: number, closed = true): void => {
    const value = text.slice(offset, end);
    tokens.push({ kind, start: offset, end, text: value, closed });
    offset = end;
    lineHead = false;
  };
  const delimited = (kind: TokenKind, close: string): void => {
    const start = offset;
    const end = text.indexOf(close, offset + 1);
    if (end < 0) {
      issues.push({ start, end: start + 1, code: 'unclosed-delimiter', message: t('Missing closing {0}.', close) });
    }
    push(kind, end < 0 ? text.length : end + 1, end >= 0);
  };

  while (offset < text.length) {
    const char = text[offset]!;
    if (/\s/.test(char)) {
      if (char === '\n' || char === '\r') lineHead = true;
      offset++;
      continue;
    }
    if (char === '%') {
      const end = text.indexOf('\n', offset);
      push('variable', end < 0 ? text.length : end);
    } else if (char === '"' || char === "'" || char === '`') {
      // Fumen's ordinary text (unlike variable JSON strings) has no backslash escaping.
      delimited('text', char);
    } else if (char === '[') {
      delimited(lineHead ? 'section' : 'bracket', ']');
    } else if (char === '(') {
      delimited('time', ')');
    } else if ((char === '<' || char === '>') && lineHead) {
      push('alignment', offset + 1);
    } else if (text.startsWith('<:', offset)) {
      const duration = /^<:[\d_.~]*/.exec(text.slice(offset))![0];
      push('syncopation', offset + duration.length);
    } else if (char === '<') {
      delimited('sign', '>');
    } else {
      const bar = /^(?:\.\/\|\/\.|:\|\|:?(?:x(?:\d+|X))?|\|\|[.:]?|\|)/.exec(text.slice(offset));
      if (bar) {
        push('bar', offset + bar[0].length);
      } else if (char === ']' || char === ')') {
        issues.push({ start: offset, end: offset + 1, code: 'unexpected-delimiter', message: t('Unexpected {0} without a matching opening delimiter.', char) });
        push('symbol', offset + 1);
      } else if ('>,@'.includes(char)) {
        push('symbol', offset + 1);
      } else {
        let end = offset + 1;
        // Parentheses inside a chord token are left alone; chord spelling is not validated.
        while (end < text.length && !/[\s|\[\]<>"'`%@]/.test(text[end]!)) end++;
        push('word', end);
      }
    }
  }
  return { tokens, issues };
}

export interface Variable {
  name: string;
  nameStart: number;
  nameEnd: number;
  equals: number;
  valueStart: number;
  valueEnd: number;
  rawValue: string;
}

export function readVariable(token: Token): Variable | undefined {
  const match = /^%\s*([A-Za-z_][A-Za-z_0-9]*)?\s*(=)?/.exec(token.text);
  if (!match) return undefined;
  const name = match[1] ?? '';
  const nameIndex = name ? token.text.indexOf(name, 1) : 1;
  const equalsIndex = match[2] ? match[0].lastIndexOf('=') : -1;
  const afterEquals = equalsIndex < 0 ? token.text.length : equalsIndex + 1;
  const tail = token.text.slice(afterEquals);
  const valueOffset = afterEquals + tail.length - tail.trimStart().length;
  const rawValue = tail.trim();
  return {
    name,
    nameStart: token.start + nameIndex,
    nameEnd: token.start + nameIndex + name.length,
    equals: equalsIndex < 0 ? -1 : token.start + equalsIndex,
    valueStart: token.start + valueOffset,
    valueEnd: token.start + valueOffset + rawValue.length,
    rawValue
  };
}
