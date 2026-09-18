type ImportGroup = 'node' | 'package' | 'alias' | 'relative';

type NamedImport = { isTypeOnly: boolean; module: string; specifiers: string[] };

type ParsedImport =
  | { kind: 'side-effect'; source: string }
  | ({ kind: 'named' } & NamedImport);

// Side-effect-only import: `import './x.css';` — no bound names at all.
const SIDE_EFFECT_IMPORT_RE = /^import\s+['"]([^'"]+)['"];?\s*$/;
// Named import, optionally type-only: `import { a, b } from 'x';` or
// `import type { a, b } from 'x';`. Group 1 is the optional `type` keyword, group 2 is
// the raw comma-separated specifier list, group 3 is the module specifier.
const NAMED_IMPORT_RE = /^import\s+(type\s+)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?\s*$/;

// This exercise's fixtures only ever use side-effect imports and named imports (with or
// without `type`) — no default or namespace imports — to keep the parsing regexes small.
function parseImportLine(line: string): ParsedImport | null {
  const named = NAMED_IMPORT_RE.exec(line);
  if (named) {
    const specifiers = (named[2] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return { kind: 'named', isTypeOnly: Boolean(named[1]), module: named[3]!, specifiers };
  }
  const sideEffect = SIDE_EFFECT_IMPORT_RE.exec(line);
  if (sideEffect) return { kind: 'side-effect', source: line.trim() };
  return null;
}

// Buckets a module specifier the way Biome/oxfmt-style import sorting does:
// `node:`-prefixed builtins, then bare package names, then `@/`-aliased internal
// modules, then relative paths.
function classify(moduleSpecifier: string): ImportGroup {
  if (moduleSpecifier.startsWith('node:')) return 'node';
  if (moduleSpecifier.startsWith('@/')) return 'alias';
  if (moduleSpecifier.startsWith('.')) return 'relative';
  return 'package';
}

// Renders one merged named import back to a single-quoted, semicolon-terminated line,
// with its specifiers sorted alphabetically (ignoring a leading "type " on an inline
// type specifier when comparing, but keeping it in the output).
function renderNamed(imp: NamedImport): string {
  const sorted = [...imp.specifiers].sort((a, b) =>
    a.replace(/^type\s+/, '').localeCompare(b.replace(/^type\s+/, '')),
  );
  const prefix = imp.isTypeOnly ? 'import type ' : 'import ';
  return `${prefix}{ ${sorted.join(', ')} } from '${imp.module}';`;
}

// Splits `source` into its leading contiguous block of import/blank lines, and
// everything after. Already implemented — the exercise starts after parsing.
function splitImportBlock(source: string): { importLines: string[]; rest: string } {
  const lines = source.split('\n');
  let end = 0;
  while (end < lines.length) {
    const trimmed = lines[end]!.trim();
    if (trimmed === '' || trimmed.startsWith('import ')) {
      end++;
      continue;
    }
    break;
  }
  const importLines = lines
    .slice(0, end)
    .map((l) => l.trim())
    .filter(Boolean);
  const rest = lines.slice(end).join('\n').replace(/^\s*\n+/, '');
  return { importLines, rest };
}

export function organizeImports(source: string): string {
  const { importLines, rest } = splitImportBlock(source);

  const sideEffects: string[] = [];
  const named = new Map<string, NamedImport>();

  for (const line of importLines) {
    const parsed = parseImportLine(line);
    if (!parsed) continue;
    if (parsed.kind === 'side-effect') {
      sideEffects.push(parsed.source);
      continue;
    }

    const key = `${parsed.isTypeOnly ? 'type' : 'value'}:${parsed.module}`;
    const existing = named.get(key);
    if (existing) {
      for (const specifier of parsed.specifiers) {
        if (!existing.specifiers.includes(specifier)) existing.specifiers.push(specifier);
      }
    } else {
      named.set(key, { isTypeOnly: parsed.isTypeOnly, module: parsed.module, specifiers: [...parsed.specifiers] });
    }
  }

  const groups: Record<ImportGroup, NamedImport[]> = { node: [], package: [], alias: [], relative: [] };

  for (const entry of named.values()) {
    groups[classify(entry.module)].push(entry);
  }
  for (const key of Object.keys(groups) as ImportGroup[]) {
    groups[key].sort((a, b) => a.module.localeCompare(b.module));
  }

  const blocks: string[] = [];
  if (sideEffects.length > 0) blocks.push(sideEffects.join('\n'));

  for (const key of ['node', 'package', 'alias', 'relative'] as ImportGroup[]) {
    if (groups[key].length > 0) blocks.push(groups[key].map(renderNamed).join('\n'));
  }

  const importBlock = blocks.join('\n\n');
  if (rest.trim() === '') return `${importBlock}\n`;
  return `${importBlock}\n\n${rest}`;
}

export default function App() {
  const example = organizeImports(
    [
      "import './global.css';",
      "import { useState } from 'react';",
      "import type { Props } from './types';",
      "import { helper } from '@/lib/helper';",
      "import { readFile } from 'node:fs/promises';",
      '',
      'export const value = 1;',
    ].join('\n'),
  );
  return (
    <pre style={{ padding: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{example}</pre>
  );
}
