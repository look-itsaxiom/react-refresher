/**
 * Split a SQL script into statements. Handles single-quoted strings (with '' escapes),
 * double-quoted identifiers, line and block comments, and dollar-quoted strings ($$...$$ or $tag$...$tag$).
 * Comments are removed from the output; whitespace is trimmed; empty statements are dropped.
 */
export function splitStatements(script: string): string[] {
  const out: string[] = [];
  let buf = '';
  let i = 0;
  const n = script.length;
  while (i < n) {
    const ch = script[i]!;
    const next = script[i + 1];
    if (ch === '-' && next === '-') {
      while (i < n && script[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = script.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (script[j] === ch) {
          if (ch === "'" && script[j + 1] === "'") { j += 2; continue; }
          break;
        }
        j++;
      }
      buf += script.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(script.slice(i));
      if (m) {
        const tag = m[0];
        const end = script.indexOf(tag, i + tag.length);
        const stop = end === -1 ? n : end + tag.length;
        buf += script.slice(i, stop);
        i = stop;
        continue;
      }
    }
    if (ch === ';') {
      const s = buf.trim();
      if (s) out.push(s);
      buf = '';
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  const last = buf.trim();
  if (last) out.push(last);
  return out;
}
