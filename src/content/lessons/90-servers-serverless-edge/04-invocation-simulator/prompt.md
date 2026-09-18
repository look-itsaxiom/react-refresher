# Simulate cold starts across three hosting models

Model how `server`, `function`, and `isolate` hosting differ under load, using nothing
but timestamps and durations -- no network, no real timers.

## Types (already declared for you)

```ts
type Invocation = { t: number; durationMs: number };
type Model = {
  kind: 'server' | 'function' | 'isolate';
  coldStartMs: number;
  idleTimeoutMs: number;
  maxConcurrencyPerInstance: number;
};
type SimResult = {
  coldStarts: number;
  p50Ms: number;
  p95Ms: number;
  instanceSeconds: number;
  requestCount: number;
};
type Pricing = { perRequest: number; perGbSecond: number; memoryGb: number };
```

## 1. `simulateInvocations(requests: Invocation[], model: Model): SimResult`

Process `requests` sorted by `t` ascending (the input isn't guaranteed sorted). For each
request, decide which instance serves it and how long that takes, under these rules:

### `model.kind === 'server'`

One instance, already warm, unlimited concurrency, no cold starts ever:

- Every request's latency is just its own `durationMs`.
- `coldStarts` is always `0`.
- `instanceSeconds` is the wall-clock time the (always-on) instance has existed:
  `(the latest t + durationMs across all requests) / 1000`. A server is billed for
  uptime, not usage -- concurrency is free.

### `model.kind === 'function' | 'isolate'`

Both share one model; only the numbers you pass in differ between them:

- An instance can hold up to `model.maxConcurrencyPerInstance` requests **concurrently**.
  A request is "concurrent" with another on the same instance if their `[t, t+latency)`
  intervals overlap.
- When a request arrives, look for an existing, non-retired instance with fewer than
  `maxConcurrencyPerInstance` requests currently active at time `t`. Reuse the first one
  you find; that request's latency is just its `durationMs` (no cold start).
- If none qualifies, create a new instance. That request incurs a cold start: its
  latency is `model.coldStartMs + durationMs`, and the new instance's activity is
  recorded using that longer end time.
- An instance **retires** -- and can never be reused again -- once it has had zero
  active requests for at least `model.idleTimeoutMs`. Concretely: if an instance is
  currently idle (no request active at time `t`) and `t - <time its last request
  ended>` is `>= idleTimeoutMs`, skip it as a candidate. (If it's *not yet* idle that
  long, it's still reusable, even though nothing is active on it at time `t`.)
- `instanceSeconds` is the sum of every request's own latency (its billed execution
  time, including any cold start it personally paid for), in seconds -- concurrency
  is *not* free here; two requests running at once on one instance still cost two
  requests' worth of execution time.

### Both cases

- `requestCount` is simply `requests.length`.
- `p50Ms`/`p95Ms` are percentiles over the per-request latencies (the value each request
  actually experienced, cold start included where it applies), using the "nearest rank"
  method: sort ascending, then for percentile `p` take the value at index
  `Math.ceil((p / 100) * n) - 1` (0-indexed, `n` = number of requests).

## 2. `estimateCost(sim: SimResult, pricing: Pricing): number`

```
cost = sim.requestCount * pricing.perRequest
     + sim.instanceSeconds * pricing.memoryGb * pricing.perGbSecond
```

Return that number as-is (no rounding).

## Files

- `App.tsx` -- both functions above, plus a default `App` component rendering any short
  string (e.g. `<p>Simulator ready</p>`).
