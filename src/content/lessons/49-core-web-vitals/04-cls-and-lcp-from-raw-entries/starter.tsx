export type ShiftEntry = { startTime: number; value: number; hadRecentInput: boolean };
export type LcpCandidate = { size: number; renderTime: number };
export type ScriptTiming = { name: string; duration: number };
export type LoafEntry = { scripts: ScriptTiming[] };

// TODO: implement CLS session windows. A new session starts when the gap since the
// previous entry exceeds 1000ms, or the session would otherwise exceed 5000ms total
// span. Return the highest-scoring session's total, ignoring hadRecentInput entries.
export function clsFromShifts(_shifts: ShiftEntry[]): number {
  return 0;
}

// TODO: pick the largest candidate rendered before firstInteractionAt; on a size tie,
// the later renderTime wins. Return its renderTime, or 0 if nothing qualifies.
export function lcpCandidateResolution(_entries: LcpCandidate[], _firstInteractionAt: number): number {
  return 0;
}

// TODO: sum each script's duration across every LoAF entry, return the name with the
// highest total (or null if there are none).
export function attributeLongTask(_loafEntries: LoafEntry[]): string | null {
  return null;
}

const clsFixture: ShiftEntry[] = [
  { startTime: 0, value: 0.05, hadRecentInput: false },
  { startTime: 400, value: 0.08, hadRecentInput: false },
  { startTime: 900, value: 0.02, hadRecentInput: false }, // gap 500ms: same session
  { startTime: 2500, value: 0.2, hadRecentInput: false }, // gap 1600ms: new session
  { startTime: 2600, value: 0.01, hadRecentInput: true }, // ignored (recent input)
];

const lcpFixture: LcpCandidate[] = [
  { size: 1200, renderTime: 300 },
  { size: 4800, renderTime: 1100 },
  { size: 4800, renderTime: 1900 }, // tie on size, later renderTime should win
  { size: 3000, renderTime: 3500 }, // after firstInteractionAt, excluded
];

const loafFixture: LoafEntry[] = [
  { scripts: [{ name: 'analytics.js', duration: 40 }, { name: 'app.js', duration: 30 }] },
  { scripts: [{ name: 'analytics.js', duration: 45 }] },
];

export default function App() {
  const cls = clsFromShifts(clsFixture);
  const lcp = lcpCandidateResolution(lcpFixture, 3000);
  const culprit = attributeLongTask(loafFixture);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <p data-testid="cls">Worst CLS session score: {cls.toFixed(2)}</p>
      <p data-testid="lcp">Final LCP renderTime: {lcp}</p>
      <p data-testid="culprit">Long task culprit script: {culprit ?? 'none'}</p>
    </div>
  );
}
