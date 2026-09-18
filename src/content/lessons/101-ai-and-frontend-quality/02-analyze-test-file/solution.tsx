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

// ---- The scanner. ----

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

  const tests: AnalyzedTest[] = segments.map(({ marker, text }) => {
    const smells: TestSmell[] = [];
    if (marker.modifier === 'skip') smells.push('skipped');
    if (marker.modifier === 'only') smells.push('only');
    if (!text.includes('expect(')) smells.push('no-assertion');
    if (TAUTOLOGY_RE.test(text)) smells.push('tautology');
    if (IMPLEMENTATION_DETAIL_RE.test(text)) smells.push('implementation-detail');
    if (snapshotOveruseActive && SNAPSHOT_CALL_RE.test(text)) smells.push('snapshot-overuse');
    if (mocksSubject) smells.push('mocks-subject');
    return { name: marker.name, smells };
  });

  const summary: string[] = [];
  if (mocksSubject) {
    summary.push(
      'vi.mock() mocks the module under test — every test here is exercising the mock, not the real implementation.',
    );
  }
  if (!hasNegativeCase) {
    summary.push('No test name mentions a negative case (not/invalid/error/empty/fails).');
  }

  let score = 100;
  for (const t of tests) {
    if (t.smells.includes('tautology')) score -= 20;
    if (t.smells.includes('no-assertion')) score -= 20;
    if (t.smells.includes('only')) score -= 15;
    if (t.smells.includes('snapshot-overuse')) score -= 10;
    if (t.smells.includes('skipped')) score -= 5;
    if (t.smells.includes('implementation-detail')) score -= 5;
  }
  if (mocksSubject) score -= 15;
  if (!hasNegativeCase) score -= 10;
  score = Math.max(0, score);

  return { tests, score, summary };
}
