/** hints.md uses a line containing only `---` between hints. */
export function splitHints(raw: string): string[] {
  return raw
    .split(/\r?\n---\r?\n/)
    .map((h) => h.trim())
    .filter((h) => h.length > 0);
}
