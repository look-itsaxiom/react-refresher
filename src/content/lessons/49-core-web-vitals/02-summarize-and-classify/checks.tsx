import type { Check } from '../../../types';

type MetricName = 'LCP' | 'INP' | 'CLS';
type Sample = { metric: MetricName; value: number; url: string };
type MetricSummary = { p75: number; classification: string; count: number };
type VitalsSummary = {
  overall: Partial<Record<MetricName, MetricSummary>>;
  byUrl: Record<string, Partial<Record<MetricName, MetricSummary>>>;
};

export const checks: Check[] = [
  {
    name: 'p75 uses nearest-rank: for [1000,2000,3000,4000] the p75 is the 3rd value, 3000',
    run: async ({ mod, expect }) => {
      const summarizeVitals = mod.summarizeVitals as (samples: Sample[]) => VitalsSummary;
      const samples: Sample[] = [1000, 2000, 3000, 4000].map((value) => ({ metric: 'LCP', value, url: '/' }));
      const result = summarizeVitals(samples);
      expect(result.overall.LCP?.p75).to.equal(3000);
      expect(result.overall.LCP?.count).to.equal(4);
    },
  },
  {
    name: 'classification follows the official LCP/INP/CLS thresholds from the computed p75',
    run: async ({ mod, expect }) => {
      const summarizeVitals = mod.summarizeVitals as (samples: Sample[]) => VitalsSummary;
      const result = summarizeVitals([
        { metric: 'LCP', value: 2000, url: '/' }, // good, <= 2500
        { metric: 'INP', value: 600, url: '/' }, // poor, > 500
        { metric: 'CLS', value: 0.18, url: '/' }, // needs-improvement, between 0.1 and 0.25
      ]);
      expect(result.overall.LCP?.classification).to.equal('good');
      expect(result.overall.INP?.classification).to.equal('poor');
      expect(result.overall.CLS?.classification).to.equal('needs-improvement');
    },
  },
  {
    name: 'byUrl breaks summaries out per URL, and a metric with no samples for a group is omitted',
    run: async ({ mod, expect }) => {
      const summarizeVitals = mod.summarizeVitals as (samples: Sample[]) => VitalsSummary;
      const result = summarizeVitals([
        { metric: 'LCP', value: 1000, url: '/' },
        { metric: 'LCP', value: 5000, url: '/pricing' },
        { metric: 'CLS', value: 0.02, url: '/' },
      ]);
      expect(result.byUrl['/']?.LCP?.p75).to.equal(1000);
      expect(result.byUrl['/pricing']?.LCP?.p75).to.equal(5000);
      expect(result.byUrl['/pricing']?.LCP?.classification).to.equal('poor');
      expect(result.byUrl['/']?.INP).to.equal(undefined);
      expect(result.overall.INP).to.equal(undefined);
    },
  },
  {
    name: 'inpFromInteractions returns the max when there are 50 or fewer interactions',
    run: async ({ mod, expect }) => {
      const inpFromInteractions = mod.inpFromInteractions as (values: number[]) => number;
      const values = [80, 120, 95, 610, 140, 90];
      expect(inpFromInteractions(values)).to.equal(610);
    },
  },
  {
    name: 'inpFromInteractions discards the single worst interaction once past 50 recorded',
    run: async ({ mod, expect }) => {
      const inpFromInteractions = mod.inpFromInteractions as (values: number[]) => number;
      // 60 interactions: 59 fast ones at 100ms, one outlier at 900ms.
      // With > 50 interactions the single worst (900) is discarded, so the answer is 100.
      const values = [900, ...Array.from({ length: 59 }, () => 100)];
      expect(inpFromInteractions(values)).to.equal(100);
    },
  },
  {
    name: 'inpFromInteractions discards two worst interactions past 100 recorded',
    run: async ({ mod, expect }) => {
      const inpFromInteractions = mod.inpFromInteractions as (values: number[]) => number;
      // 101 interactions: two outliers (900, 800) plus 99 at 100ms.
      // floor(101 / 50) = 2 discarded, so the two outliers are dropped and 100 remains.
      const values = [900, 800, ...Array.from({ length: 99 }, () => 100)];
      expect(inpFromInteractions(values)).to.equal(100);
    },
  },
  {
    name: 'the rendered App shows the computed overall LCP p75 and classification',
    run: async ({ render, screen, expect, act, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      expect(screen.getByTestId('overall-lcp').textContent).to.match(/Overall LCP p75: \d+ \(\w[\w-]*\)/);
      expect(screen.getByTestId('inp').textContent).to.include('610');
    },
  },
];
