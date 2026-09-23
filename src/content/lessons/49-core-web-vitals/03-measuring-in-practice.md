# Measuring in practice

Knowing the definitions doesn't get numbers out of a real browser. This is the tooling
layer: the raw Performance APIs, the library that wraps them correctly, how to ship that
data somewhere, and how to read what other people's tools already collected about your
site.

## `PerformanceObserver` entry types

Each Core Web Vital (and its supporting data) shows up as a `PerformanceEntry` you can
subscribe to:

```ts
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // entry.entryType is one of the strings below
  }
}).observe({ type: 'largest-contentful-paint', buffered: true });
```

- **`largest-contentful-paint`** — one entry per LCP candidate as they're discovered;
  the last one before the first interaction is the final value.
- **`event`** — fires for interactions once their full duration is known; the fields you
  care about are `duration` (this is the raw material INP is built from) and
  `interactionId`, which groups the multiple events one gesture can fire (e.g.
  `pointerdown`/`pointerup`/`click`) so they're not triple-counted.
- **`layout-shift`** — one entry per shift, with `value`, `hadRecentInput`, and the
  `sources` array naming the elements that moved.
- **`long-animation-frame`** — Chrome 123+; fires when a frame's rendering work exceeds
  50ms, with a `scripts` array attributing time to individual `PerformanceScriptTiming`
  entries (name, duration, invoker, `sourceURL`). Attribution only covers same-origin
  main-thread scripts — cross-origin iframes, workers, and extensions contribute to the
  frame's duration but can't be named.
- **`navigation`** and **`resource`** — the older Navigation/Resource Timing entries;
  still how you get TTFB, DNS/TLS timings, and per-request timing breakdowns.

`buffered: true` matters: without it you only see entries that fire *after* the observer
is created, which misses everything that already happened before your script ran (LCP
candidates from the initial paint, for instance).

## The `web-vitals` library, with attribution

Wiring up `PerformanceObserver` correctly — handling the "final value" logic for LCP,
grouping `event` entries into the discard-one-per-50 INP calculation, running the CLS
session-window algorithm — is exactly fiddly enough that almost nobody does it by hand.
Google's `web-vitals` library (v5) does it for you:

```ts
import { onLCP, onINP, onCLS } from 'web-vitals';

onLCP((metric) => sendToAnalytics('LCP', metric.value));
onINP((metric) => sendToAnalytics('INP', metric.value));
onCLS((metric) => sendToAnalytics('CLS', metric.value));
```

The standard build gives you the number. The **attribution build** (`web-vitals/attribution`)
gives you *why*, which is what actually gets a fix shipped:

```ts
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';

onLCP((metric) => {
  // metric.attribution.target        -> CSS selector of the LCP element
  // metric.attribution.timeToFirstByte, resourceLoadDelay,
  //   resourceLoadDuration, elementRenderDelay -> where the time went
});
onINP((metric) => {
  // metric.attribution.interactionTarget, interactionType
  // metric.attribution.inputDelay, processingDuration, presentationDelay
  // metric.attribution.longAnimationFrameEntries -> LoAF entries during the interaction
});
onCLS((metric) => {
  // metric.attribution.largestShiftTarget, largestShiftTime, largestShiftValue
});
```

That's the difference between "INP is 620ms, good luck" and "the Add to Cart button's
click handler spent 400ms of processing time inside `analytics.bundle.js`."

## Building a RUM pipeline

Real User Monitoring means running the above in production, on real visitors, and
getting the data somewhere durable without hurting the page:

- **Sample.** At meaningful traffic, sending every metric for every visitor is wasteful;
  sample (e.g. 10–20%) and say so in your dashboards so p75 math on a sampled set isn't
  misread as the true p75.
- **Send with `sendBeacon`, on `visibilitychange`/`pagehide`.** A metric like CLS or INP
  can still update until the page is torn down, so the last send has to survive
  navigation away. `navigator.sendBeacon()` queues the request and lets the browser
  deliver it even after the page unloads; a `fetch` call started in a `pagehide` handler
  can be cancelled mid-flight. `visibilitychange` firing to `'hidden'` is the more
  reliable signal on mobile than `pagehide`/`beforeunload`, which don't fire consistently
  when a tab is killed in the background.
- **Attach context**, not just the number: URL, connection type (`navigator.connection`),
  device memory, and a build/version identifier, or every regression investigation starts
  from zero.

## Reading data you didn't collect

- **CrUX (Chrome UX Report)** aggregates real Chrome user data per origin/URL,
  updated as a rolling 28-day window, and is the source of truth for "how Google sees
  your site's field performance" — it's what actually feeds the Core Web Vitals report in
  Search Console and the ranking signal.
- **PageSpeed Insights (PSI)** shows both a CrUX field summary (if the URL has enough
  traffic to have CrUX data at all) and a fresh Lighthouse lab run side by side — read the
  field section first; the lab section explains *why*, using simulated throttling that
  won't match your real traffic mix.
- **Search Console's Core Web Vitals report** groups your site's URLs into
  good/needs-improvement/poor buckets straight from CrUX, which is the fastest way to see
  which URL patterns are failing at scale rather than debugging one URL at a time.

## DevTools, `performance.mark`, and budgets

- The **Performance panel**'s recorded trace surfaces **Insights** (the successor to the
  old flat audit list, and — as of Lighthouse 13 — the same insight definitions
  Lighthouse itself now uses) directly annotated on the timeline: "LCP by phase," "Layout
  shift culprits," "Long animation frame" call trees you can expand straight to the
  offending function.
- `performance.mark('checkout:start')` / `performance.measure('checkout', 'checkout:start', 'checkout:end')`
  create custom entries you can correlate with CWV entries in the same trace or RUM
  payload — useful for "was the slow INP during checkout specifically." `Server-Timing`
  response headers do the same thing across the network boundary, surfacing backend
  phase timings (`db`, `cache`, `render`) inside the browser's own Navigation Timing
  entry.
- **Budgets in CI**: Lighthouse CI (or PSI's API) run against a fixed environment can
  fail a build when LCP/CLS/bundle size regresses past a threshold — this catches lab
  regressions before merge, which is a different job from RUM catching field regressions
  after ship. A bundle-size check (`bundlesize`, `size-limit`) is a cheap leading
  indicator since JS weight is one of the more common root causes behind a creeping INP.
- The **React Profiler** (DevTools' Components/Profiler tabs, or `<Profiler>` in code)
  answers "which component's render is slow," which is one layer downstream of "INP is
  bad" — CWV tells you something is slow for users, the Profiler tells you which
  component to fix. Lesson 54 covers it in depth.

## Further reading (optional)

- [web.dev — `web-vitals` library on GitHub](https://github.com/GoogleChrome/web-vitals)
- [Chrome for Developers — Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames)
- [Chrome for Developers — What's new in Lighthouse 13](https://developer.chrome.com/blog/lighthouse-13-0)
- [web.dev — Debug performance issues with Server-Timing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing)
