export type MetricName = 'LCP' | 'INP' | 'CLS';
export type Sample = { metric: MetricName; value: number; url: string };

export type Classification = 'good' | 'needs-improvement' | 'poor';
export type MetricSummary = { p75: number; classification: Classification; count: number };
export type VitalsSummary = {
  overall: Partial<Record<MetricName, MetricSummary>>;
  byUrl: Record<string, Partial<Record<MetricName, MetricSummary>>>;
};

const THRESHOLDS: Record<MetricName, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
};

// TODO: nearest-rank p75: sort ascending, take the value at rank ceil(0.75 * n), 1-indexed.
function p75(_values: number[]): number {
  return 0;
}

function classify(metric: MetricName, value: number): Classification {
  const { good, poor } = THRESHOLDS[metric];
  if (value <= good) return 'good';
  if (value > poor) return 'poor';
  return 'needs-improvement';
}

// TODO: group samples by metric (for `overall`) and by url then metric (for `byUrl`),
// compute p75 + classification + count for each group, and omit empty groups entirely.
export function summarizeVitals(samples: Sample[]): VitalsSummary {
  return { overall: {}, byUrl: {} };
}

// TODO: discard the single worst interaction for every 50 interactions recorded, then
// return the worst remaining one. 50 or fewer interactions: just the maximum.
export function inpFromInteractions(interactions: number[]): number {
  return Math.max(0, ...interactions);
}

const fixtureSamples: Sample[] = [
  { metric: 'LCP', value: 1800, url: '/' },
  { metric: 'LCP', value: 2100, url: '/' },
  { metric: 'LCP', value: 4800, url: '/' },
  { metric: 'LCP', value: 3900, url: '/pricing' },
  { metric: 'INP', value: 120, url: '/' },
  { metric: 'INP', value: 610, url: '/' },
  { metric: 'CLS', value: 0.02, url: '/' },
];

const fixtureInteractions = [80, 120, 95, 140, 610, 90, 110, 130, 75, 88];

export default function App() {
  const summary = summarizeVitals(fixtureSamples);
  const inp = inpFromInteractions(fixtureInteractions);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <p data-testid="overall-lcp">
        Overall LCP p75: {summary.overall.LCP?.p75 ?? 'n/a'} ({summary.overall.LCP?.classification ?? 'n/a'})
      </p>
      <p data-testid="url-lcp">
        `/` LCP p75: {summary.byUrl['/']?.LCP?.p75 ?? 'n/a'}
      </p>
      <p data-testid="inp">Computed INP from fixture interactions: {inp}</p>
    </div>
  );
}
