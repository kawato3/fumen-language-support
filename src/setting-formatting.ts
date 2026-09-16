const settingOrder = ['TITLE', 'SUB_TITLE', 'ARTIST', 'KEY', 'TRANSPOSE', 'KEY_TYPE', 'SHOW_STAFF', 'SHOW_FOOTER', 'PARAM'];
const paramOrder = ['paper_width', 'paper_height', 'minor_label', 'major_label', 'chord_suffix_style'];

function rank(name: string, order: readonly string[]): number {
  const index = order.indexOf(name);
  return index < 0 ? order.length : index;
}

interface Setting {
  name: string;
  value: string;
  afterPercent: string;
  beforeEquals: string;
  afterEquals: string;
  valueStart: number;
}

export function parseSetting(line: string): Setting | undefined {
  const match = /^%([ \t]*)([A-Za-z_][A-Za-z_0-9]*)([ \t]*)=([ \t]*)/.exec(line);
  if (!match) return undefined;
  const [prefix, afterPercent = '', name = '', beforeEquals = '', afterEquals = ''] = match;
  let end = line.length;
  while (end > prefix.length && /[ \t]/.test(line.charAt(end - 1))) --end;
  const value = line.slice(prefix.length, end);
  try {
    JSON.parse(value);
  } catch {
    return undefined;
  }
  return { name, value, afterPercent, beforeEquals, afterEquals,
    valueStart: prefix.length };
}

/** Invalid or repeated assignments make the run ambiguous; never merge or discard them. */
export function orderSettings(settings: readonly (Setting | undefined)[]): (Setting | undefined)[] {
  const valid = settings.filter((setting): setting is Setting => setting !== undefined);
  if (valid.length !== settings.length || new Set(valid.map(setting => setting.name)).size !== valid.length) {
    return [...settings];
  }
  return valid.sort((a, b) => rank(a.name, settingOrder) - rank(b.name, settingOrder))
    .map(setting => setting.name === 'PARAM' ? { ...setting, value: orderParam(setting.value) } : setting);
}

/** Split already-validated JSON only at top-level commas. Keep literal values,
 * escaped key spellings and nested objects intact; JSON.stringify would not.
 */
function orderParam(value: string): string {
  if (!value.startsWith('{') || /^\{[ \t]*\}$/.test(value)) return value;
  const members: string[] = [];
  let start = 1;
  let depth = 0;
  let quoted = false;
  for (let i = 1; i < value.length - 1; ++i) {
    const char = value[i];
    if (quoted && char === '\\') ++i;
    else if (char === '"') quoted = !quoted;
    else if (!quoted) {
      if (char === '{' || char === '[') ++depth;
      else if (char === '}' || char === ']') --depth;
      else if (char === ',' && depth === 0) {
        members.push(value.slice(start, i));
        start = i + 1;
      }
    }
  }
  members.push(value.slice(start, -1));
  const entries = members.map(member => {
    const body = member.trim();
    const leading = member.slice(0, member.indexOf('"'));
    const trailing = member.slice(leading.length + body.length);
    const key = /^"(?:\\.|[^"\\])*"/.exec(body)![0];
    return { name: JSON.parse(key) as string, body, leading, trailing };
  });
  if (new Set(entries.map(entry => entry.name)).size !== entries.length) return value;
  const sorted = [...entries].sort((a, b) => rank(a.name, paramOrder) - rank(b.name, paramOrder));
  // Whitespace belongs to the original slot, so moving a member does not move
  // a space from after a comma to before it (or introduce further reformatting).
  return `{${entries.map((entry, i) => entry.leading + sorted[i]!.body + entry.trailing).join(',')}}`;
}
