RUM pipelines don't hand you a p75 — they hand you a pile of individual samples, and you
compute the p75 yourself before you can say whether a page is "good." This exercise is
that math, done twice: once across whole metrics, once for the specific discard-one-per-50
rule INP actually uses instead of a literal percentile.

## 1. `summarizeVitals(samples)`

`samples` is an array of `{ metric: 'LCP' | 'INP' | 'CLS'; value: number; url: string }`.
Implement `summarizeVitals` to return:

```ts
type Classification = 'good' | 'needs-improvement' | 'poor';
type MetricSummary = { p75: number; classification: Classification; count: number };
type VitalsSummary = {
  overall: Partial<Record<'LCP' | 'INP' | 'CLS', MetricSummary>>;
  byUrl: Record<string, Partial<Record<'LCP' | 'INP' | 'CLS', MetricSummary>>>;
};
```

- Group samples by metric (for `overall`) and by `url` then metric (for `byUrl`). A
  metric with zero samples for a given grouping should simply be absent from that
  grouping's object — don't emit a summary with `count: 0`.
- `p75` uses the **nearest-rank** method: sort the metric's values ascending, then take
  the value at rank `Math.ceil(0.75 * n)`, 1-indexed (so for `n = 4`, rank 3, the third
  smallest value).
- `classification` is computed from the official thresholds, applied to the `p75` you
  just computed:
  - LCP: good ≤ 2500, poor > 4000, else needs-improvement.
  - INP: good ≤ 200, poor > 500, else needs-improvement.
  - CLS: good ≤ 0.1, poor > 0.25, else needs-improvement.

## 2. `inpFromInteractions(interactions)`

`interactions` is a plain array of interaction latencies in milliseconds (already
per-interaction, already deduplicated by `interactionId` — you're not given raw `event`
entries here, just the numbers). Implement the actual INP selection rule described in the
concept step: discard the single worst interaction for every 50 interactions recorded,
then return the worst *remaining* one. With 50 or fewer interactions, that's just the
maximum.

Both functions are pure — no DOM, no timers. `App` below renders their output against a
small fixture so you can see it working; you shouldn't need to touch `App`.
