// Demo fixture — feel free to edit this one, it's just what the preview renders.
const SAMPLE = `import { render } from '@testing-library/react';
import { it, expect } from 'vitest';
import { Total } from './Total';

it('renders the total', () => {
  render(<Total value={10} />);
  expect(true).toBe(true);
});
`;

export default function App() {
  const result = analyzeTestFile(SAMPLE);
  return (
    <div>
      <p>Score: {result.score}</p>
      <ul>
        {result.tests.map((t, i) => (
          <li key={i}>
            {t.name}: {t.smells.length > 0 ? t.smells.join(', ') : 'clean'}
          </li>
        ))}
      </ul>
      {result.summary.map((s, i) => (
        <p key={i}>{s}</p>
      ))}
    </div>
  );
}

// ---- Provided helpers. Don't change these. ----

export type TestSmell =
  | 'tautology'
  | 'no-assertion'
  | 'snapshot-overuse'
  | 'mocks-subject'
  | 'implementation-detail'
  | 'skipped'
  | 'only';

export type AnalyzedTest = { name: string; smells: TestSmell[] };
export type AnalyzeResult = { tests: AnalyzedTest[]; score: number; summary: string[] };

type TestMarker = { lineIndex: number; name: string; modifier?: 'skip' | 'only' };

/**
 * Finds every it()/test() declaration line (including .skip/.only) and slices the source into
 * one segment per test, from its declaration line to the next test's declaration (or EOF).
 */
export function findTestSegments(source: string): Array<{ marker: TestMarker; text: string }> {
  const lines = source.split(/\r?\n/);
  const DECL = /^\s*(it|test)(\.(skip|only))?\s*\(\s*(['"`])([\s\S]*?)\4/;
  const markers: TestMarker[] = [];
  lines.forEach((line, i) => {
    const m = DECL.exec(line);
    if (m) {
      markers.push({ lineIndex: i, name: m[5] ?? '', modifier: m[3] as 'skip' | 'only' | undefined });
    }
  });
  return markers.map((marker, idx) => {
    const end = idx + 1 < markers.length ? markers[idx + 1]!.lineIndex : lines.length;
    return { marker, text: lines.slice(marker.lineIndex, end).join('\n') };
  });
}

/** Strips a leading './' and a trailing extension, so two spellings of a module path compare equal. */
export function normalizeModulePath(p: string): string {
  return p.replace(/^\.\//, '').replace(/\.(tsx|ts|jsx|js)$/, '');
}

/** True if a vi.mock(...) call targets the file's first relative import — the subject under test. */
export function mocksTheSubject(source: string): boolean {
  const importMatch = /^\s*import\s+[^;]*?from\s+['"](\.[^'"]+)['"]/m.exec(source);
  if (!importMatch) return false;
  const subjectPath = normalizeModulePath(importMatch[1]!);
  const mockPaths = [...source.matchAll(/vi\.mock\(\s*['"]([^'"]+)['"]/g)].map((m) =>
    normalizeModulePath(m[1]!),
  );
  return mockPaths.includes(subjectPath);
}

// ---- Your work: implement the smell rules, the summary, and the score. ----

export const TAUTOLOGY_RE = /expect\(\s*(true|false|-?\d+(?:\.\d+)?|'[^']*'|"[^"]*")\s*\)\s*\.\s*toBe\(\s*\1\s*\)/;
export const IMPLEMENTATION_DETAIL_RE = /container\.querySelector\(|\bgetByTestId\(|\bqueryByTestId\(|\bfindByTestId\(/;
export const NEGATIVE_NAME_RE = /not|invalid|error|empty|fails/i;
export const SNAPSHOT_CALL_RE = /toMatchSnapshot\(|toMatchInlineSnapshot\(/;

export function analyzeTestFile(source: string): AnalyzeResult {
  const segments = findTestSegments(source);
  const mocksSubject = mocksTheSubject(source);
  const snapshotTotal = (source.match(new RegExp(SNAPSHOT_CALL_RE.source, 'g')) ?? []).length;
  const snapshotOveruseActive = snapshotTotal > 1;
  const hasNegativeCase = segments.some((s) => NEGATIVE_NAME_RE.test(s.marker.name));

  // TODO: build `tests`, one AnalyzedTest per segment. See the prompt's rule list for exactly
  // which smells to add and when.
  const tests: AnalyzedTest[] = segments.map((s) => ({ name: s.marker.name, smells: [] }));

  // TODO: build `summary` — a message when `mocksSubject` is true, and one when `!hasNegativeCase`.
  const summary: string[] = [];

  // TODO: compute `score` from the deduction table in the prompt, floored at 0.
  const score = 100;

  return { tests, score, summary };
}
