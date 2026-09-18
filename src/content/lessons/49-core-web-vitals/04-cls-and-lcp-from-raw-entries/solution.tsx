export type ShiftEntry = { startTime: number; value: number; hadRecentInput: boolean };
export type LcpCandidate = { size: number; renderTime: number };
export type ScriptTiming = { name: string; duration: number };
export type LoafEntry = { scripts: ScriptTiming[] };

export function clsFromShifts(shifts: ShiftEntry[]): number {
  const relevant = shifts.filter((s) => !s.hadRecentInput);
  let maxSessionScore = 0;
  let sessionScore = 0;
  let sessionStart = -Infinity;
  let sessionEnd = -Infinity;

  for (const entry of relevant) {
    const gapSinceLastShift = entry.startTime - sessionEnd;
    const windowSpanIfJoined = entry.startTime - sessionStart;
    const startsNewSession = sessionScore === 0 || gapSinceLastShift > 1000 || windowSpanIfJoined > 5000;

    if (startsNewSession) {
      sessionScore = entry.value;
      sessionStart = entry.startTime;
    } else {
      sessionScore += entry.value;
    }
    sessionEnd = entry.startTime;
    maxSessionScore = Math.max(maxSessionScore, sessionScore);
  }

  return maxSessionScore;
}

export function lcpCandidateResolution(entries: LcpCandidate[], firstInteractionAt: number): number {
  const eligible = entries.filter((e) => e.renderTime < firstInteractionAt);
  if (eligible.length === 0) return 0;

  let winner = eligible[0]!;
  for (const candidate of eligible.slice(1)) {
    if (candidate.size > winner.size) {
      winner = candidate;
    } else if (candidate.size === winner.size && candidate.renderTime > winner.renderTime) {
      winner = candidate;
    }
  }
  return winner.renderTime;
}

export function attributeLongTask(loafEntries: LoafEntry[]): string | null {
  const totals = new Map<string, number>();
  for (const entry of loafEntries) {
    for (const script of entry.scripts) {
      totals.set(script.name, (totals.get(script.name) ?? 0) + script.duration);
    }
  }

  let winnerName: string | null = null;
  let winnerDuration = -Infinity;
  for (const [name, duration] of totals) {
    if (duration > winnerDuration) {
      winnerName = name;
      winnerDuration = duration;
    }
  }
  return winnerName;
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
