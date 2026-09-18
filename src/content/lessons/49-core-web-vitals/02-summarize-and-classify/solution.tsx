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

function p75(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil(0.75 * sorted.length);
  const index = Math.min(sorted.length, Math.max(1, rank)) - 1;
  return sorted[index]!;
}

function classify(metric: MetricName, value: number): Classification {
  const { good, poor } = THRESHOLDS[metric];
  if (value <= good) return 'good';
  if (value > poor) return 'poor';
  return 'needs-improvement';
}

function summarizeGroup(metric: MetricName, values: number[]): MetricSummary {
  const rankedP75 = p75(values);
  return { p75: rankedP75, classification: classify(metric, rankedP75), count: values.length };
}

export function summarizeVitals(samples: Sample[]): VitalsSummary {
  const overallGroups = new Map<MetricName, number[]>();
  const urlGroups = new Map<string, Map<MetricName, number[]>>();

  for (const sample of samples) {
    if (!overallGroups.has(sample.metric)) overallGroups.set(sample.metric, []);
    overallGroups.get(sample.metric)!.push(sample.value);

    if (!urlGroups.has(sample.url)) urlGroups.set(sample.url, new Map());
    const byMetric = urlGroups.get(sample.url)!;
    if (!byMetric.has(sample.metric)) byMetric.set(sample.metric, []);
    byMetric.get(sample.metric)!.push(sample.value);
  }

  const overall: VitalsSummary['overall'] = {};
  for (const [metric, values] of overallGroups) {
    overall[metric] = summarizeGroup(metric, values);
  }

  const byUrl: VitalsSummary['byUrl'] = {};
  for (const [url, byMetric] of urlGroups) {
    const entry: Partial<Record<MetricName, MetricSummary>> = {};
    for (const [metric, values] of byMetric) {
      entry[metric] = summarizeGroup(metric, values);
    }
    byUrl[url] = entry;
  }

  return { overall, byUrl };
}

export function inpFromInteractions(interactions: number[]): number {
  if (interactions.length === 0) return 0;
  const descending = [...interactions].sort((a, b) => b - a);
  const discardCount = Math.floor(interactions.length / 50);
  const index = Math.min(descending.length - 1, discardCount);
  return descending[index]!;
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
