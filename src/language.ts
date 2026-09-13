import { DURATIONS, SETTINGS, SIGNS } from './catalog';
import { Issue, readVariable, scan, Token } from './notation';
import { english, Translator } from './localization';

export interface Suggestion {
  label: string;
  detail: string;
  insertText: string;
  start: number;
  end: number;
  snippet?: boolean;
  filterText?: string;
}

function completionToken(tokens: Token[], offset: number): Token | undefined {
  // At a token's end, retain its context. A following bar must not replace a duration.
  return tokens.find(token => token.start < offset && offset <= token.end);
}

export function complete(text: string, offset: number): Suggestion[] {
  const { tokens } = scan(text);
  const token = completionToken(tokens, offset);
  if (!token) return [];

  if (token.kind === 'variable') {
    const variable = readVariable(token);
    if (!variable) return [];
    if (offset >= variable.nameStart && offset <= variable.nameEnd) {
      const prefix = text.slice(variable.nameStart, offset).toUpperCase();
      return SETTINGS.filter(setting => setting.name.startsWith(prefix)).map(setting => ({
        label: setting.name,
        detail: setting.description,
        start: variable.nameStart,
        end: variable.nameEnd,
        insertText: variable.equals >= 0 ? setting.name : `${setting.name}=${setting.initial}`,
        snippet: variable.equals < 0
      }));
    }
    if (variable.equals < 0 || offset <= variable.equals) return [];
    const setting = SETTINGS.find(item => item.name === variable.name);
    if (!setting?.choices) return [];
    const start = Math.min(offset, variable.valueStart);
    const prefix = text.slice(start, offset).trimStart().replace(/^"/, '').replace(/"$/, '');
    if (!/^[A-Za-z#]*$/.test(prefix)) return [];
    return setting.choices.filter(value => value.startsWith(prefix)).map(value => ({
      label: `"${value}"`, detail: setting.description,
      start, end: Math.max(offset, variable.valueEnd), insertText: `"${value}"`,
      filterText: text.slice(start, offset).trimStart().startsWith('"') ? `"${value}"` : value
    }));
  }

  if (token.kind === 'sign') {
    const prefix = text.slice(token.start + 1, offset);
    if (/[>\r\n]/.test(prefix)) return [];
    // The tolerant scanner may find '>' in a later measure, alignment or annotation.
    // Only replace a self-contained sign; otherwise replace the typed prefix alone.
    const safeEnd = token.closed && /^<[A-Za-z0-9. \t]*>$/.test(token.text) ? token.end : offset;
    return SIGNS.filter(sign => sign.value.slice(1).toLowerCase().startsWith(prefix.toLowerCase())).map(sign => ({
      label: sign.value, detail: sign.description,
      start: token.start, end: safeEnd, insertText: sign.value
    }));
  }

  if (token.kind !== 'word' && token.kind !== 'syncopation') return [];
  const before = text.slice(token.start, offset);
  const match = /:([\d.]*)$/.exec(before);
  if (!match) return [];
  // Duration-only slashes are useful inside measures, not in arbitrary text at row start.
  const lineStart = text.lastIndexOf('\n', token.start - 1) + 1;
  if (!tokens.some(item => item.kind === 'bar' && item.start >= lineStart && item.end <= token.start)) return [];
  const prefix = match[1]!;
  const start = offset - prefix.length;
  const tail = /^[\d.]*/.exec(text.slice(offset))![0];
  return DURATIONS.filter(([value]) => value.startsWith(prefix)).map(([value, label]) => ({
    label: value, detail: label, start, end: offset + tail.length, insertText: value
  }));
}

export function diagnose(text: string, t: Translator = english): Issue[] {
  const result = scan(text, t);
  const issues = [...result.issues];
  for (const token of result.tokens) {
    if (token.kind !== 'variable') continue;
    const variable = readVariable(token);
    if (!variable?.name || variable.equals < 0) {
      issues.push({ start: token.start, end: token.end, code: 'variable-assignment', message: t("Write one setting per line in the form %NAME=value.") });
      continue;
    }
    const issue = (code: string, message: string): void => {
      issues.push({ start: variable.valueStart, end: Math.max(variable.valueStart + 1, variable.valueEnd), code, message });
    };
    let value: unknown;
    try {
      value = JSON.parse(variable.rawValue);
    } catch {
      issue('variable-json', t("Use JSON for setting values. Enclose strings in double quotes and write one setting per line."));
      continue;
    }
    const setting = SETTINGS.find(item => item.name === variable.name);
    // Renderer-specific and future variables are valid extension points, not typos.
    if (!setting) continue;
    if (setting.type === 'transpose' ? typeof value !== 'string' && !Number.isInteger(value) : typeof value !== 'string') {
      issue('variable-type', setting.type === 'transpose' ? t("%TRANSPOSE requires a string or an integer.") : t('%{0} requires a string enclosed in double quotes.', setting.name));
    } else if (setting.choices && !setting.choices.includes(value as string)) {
      issue('variable-value', t('%{0} must be one of: {1}.', setting.name, setting.choices.map(item => `"${item}"`).join(', ')));
    }
  }
  return issues.slice(0, 100);
}

export interface Help { start: number; end: number; title: string; description: string; example?: string; page: string }

export function hover(text: string, offset: number): Help | undefined {
  const { tokens } = scan(text);
  const token = tokens.find(item => item.start <= offset && offset < item.end);
  if (!token) return undefined;
  const help = (title: string, description: string, page: string, example?: string): Help => ({
    start: token.start, end: token.end, title, description, example, page
  });
  if (token.kind === 'variable') {
    const variable = readVariable(token);
    const setting = SETTINGS.find(item => item.name === variable?.name);
    return setting ? help(`%${setting.name}`, setting.description, 'variable', setting.example) : undefined;
  }
  if (token.kind === 'section') return help("Section label", "Outside a measure, [] names a section. Separate it from the previous section with a blank line for a regular section.", 'structure', '[A]');
  if (token.kind === 'bracket') return help("Repeat ending", "Inside a measure, [] marks an ending such as the first or second ending. Any text is allowed inside the brackets.", 'repeat-sign', '[1.]');
  if (token.kind === 'time') return help("Time signature", "Separate numerator and denominator with / and enclose them in parentheses. Beat counts are not validated.", 'time-sign', '(4/4)');
  if (token.kind === 'alignment') return help("Row alignment", token.text === '<' ? "At the start of a row, < requests left alignment." : "At the start of a row, > requests right alignment.", 'structure');
  if (token.kind === 'sign') {
    const normalized = token.text.replace(/\d+/g, '').replace('Segno', 'S');
    const sign = SIGNS.find(item => item.value === normalized);
    return sign ? help(token.text, sign.description, 'repeat-sign') : undefined;
  }
  if (token.kind === 'text') {
    const quote = token.text[0];
    const description = quote === "'" ? "Annotation above the chords. Add @ to attach it to the following chord." :
      quote === '`' ? "Text below the chords, such as lyrics. Use @ to attach it to the following chord, and / for a displayed line break." :
        "Text at the same height as the chords.";
    return help("Text on the score", description, 'text');
  }
  if (token.kind === 'bar') {
    const description = token.text.startsWith(':||:') ? "End and start a repeat." : token.text.startsWith(':||') ? "End a repeat. Add a count such as x3." :
      token.text === '||:' ? "Start a repeat." : token.text === '||.' ? "Final bar line." : token.text === '||' ? "Double bar line." : token.text === './|/.' ? "Repeat sign spanning a bar line." : "Measure boundary.";
    return help(token.text, description, 'structure');
  }
  if (token.kind === 'syncopation') return help("Syncopation", "Anticipate the following chord by the specified duration. No closing > is needed.", 'duration-indicator', '<:16 C:2');
  if (token.kind === 'word') {
    const duration = /:([\d_]+\.*~?)/.exec(token.text);
    if (duration && offset >= token.start + duration.index) {
      const value = duration[1]!;
      const label = DURATIONS.find(([item]) => item === value)?.[1];
      return { ...help(`:${value}`, label ?? "Duration: . for a dot, _3 and similar values for tuplets, ~ for a tie.", 'duration-indicator'), start: token.start + duration.index };
    }
    if (/^r:/.test(token.text)) return help("Rest", "Specify a duration after r:.", 'rest', 'r:4');
    if (/^-\d+-$/.test(token.text)) return help("Multi-measure rest", "The number specifies how many measures to rest.", 'rest', '-2-');
    if (/^\.\/+\.$/.test(token.text)) return help("Measure repeat", "Repeat the preceding measure content.", 'repeat-sign');
  }
  return undefined;
}
