# Knowing it broke before users tell you

Flags and canaries reduce blast radius; they don't tell you a release is bad. That's
monitoring's job, and for a React app it splits into two questions: what did React itself
catch, and what did your monitoring client report about it.

## What React 19 catches, and where

React 18 gave you exactly one hook into rendering errors: an `ErrorBoundary` class
component (`static getDerivedStateFromError` + `componentDidCatch`), still the only way to
show a fallback UI in place of a crashed subtree — React has no *function* component
equivalent, by design, because recovering from an error mid-render needs the class
lifecycle's two-phase commit.

React 19 adds three **root-level options**, passed to `createRoot(container, options)`
(and `hydrateRoot`), that run *in addition to* boundaries, not instead of them:

```tsx
const root = createRoot(container, {
  onCaughtError(error, errorInfo) {
    // an error a boundary caught and recovered from — still worth reporting
  },
  onUncaughtError(error, errorInfo) {
    // an error with no boundary above it — React unmounts the whole root
  },
  onRecoverableError(error, errorInfo) {
    // React recovered on its own: a hydration mismatch, a rendering exception during
    // concurrent work that a retry fixed, etc. The app kept running; something was still wrong.
  },
});
```

The distinction that matters operationally: `onCaughtError` and `onUncaughtError` overlap
with what a class `ErrorBoundary`'s `componentDidCatch` already sees, but they're the
place to *report* every one of those errors centrally without instrumenting every
boundary in the tree individually — set them once, at the root, and every boundary's catch
still funnels through here. `onRecoverableError` is the odd one out: nothing crashed, the
user saw a working page, but React silently discarded a mismatched server-rendered
subtree and re-rendered it client-side, or recovered from a transient concurrent-render
failure. It's the closest thing React has to "this almost broke" — a hydration mismatch
here is real evidence of a data or timing bug even though the user never saw an error
screen. Wire all three to your monitoring client's `captureException`, tagged with which
one fired, and you get boundary-caught errors, boundary-less crashes, and silent recoveries
in one place instead of three.

## Sentry for React, concretely

Sentry remains the default choice for React error monitoring as of late 2026; the shape
generalizes to Datadog RUM, Bugsnag, and Highlight, which cover overlapping ground.
(OpenTelemetry's browser SDK exists but is still less turnkey than a dedicated RUM
product for this — worth checking status again before betting a project on it.) A typical
setup:

```ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  release: import.meta.env.VITE_APP_VERSION,
  integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // scrub PII before it leaves the browser — see below
    return event;
  },
});
```

A few pieces worth naming precisely:

- **`browserTracingIntegration`** turns navigations and route changes into performance
  transactions; **`replayIntegration`** records a low-fidelity session replay, sampled
  separately from errors (`replaysSessionSampleRate` for all sessions, much higher
  `replaysOnErrorSampleRate` so you almost always get a replay attached to an error even
  though you sample most healthy sessions away).
- **`captureException(error, context)`** is the manual escape hatch for anything outside
  React's own error paths — a caught `try/catch` you still want reported, a failed
  background sync.
- **Breadcrumbs** are the trail of "what happened before this" — clicks, navigations,
  console logs, fetch calls — attached automatically to the next captured error, capped at
  a fixed count (a ring buffer) so old breadcrumbs age out rather than growing forever.
- **`beforeSend`** is your last chance to inspect or drop an event before it's sent. This
  is where PII scrubbing lives: strip emails, redact fields literally named `password`,
  `token`, `secret`, or `authorization` anywhere in the payload (recursively — nested
  objects, not just top-level keys), and return `null` from the hook entirely to drop an
  event you don't want sent at all.
- SDK version 9 changed Sentry's default for `sendDefaultPii` — worth confirming the
  current default against Sentry's own migration docs before assuming request headers and
  cookies are or aren't captured automatically in whatever version you're on; don't take
  this lesson's word for the current default.
- **Tunneling** (`tunnel: '/monitoring'`, proxied server-side to Sentry) routes error
  reports through your own domain instead of `*.sentry.io`, because ad blockers and
  privacy extensions block the latter by default — a real and common cause of "why did our
  error volume drop 40% overnight" that has nothing to do with the release being better.
- **`ignoreErrors`** (by message pattern) and **`denyUrls`** (by stack frame origin) filter
  out noise you can't fix: browser extension scripts, third-party widgets, and the
  handful of benign errors every large app accumulates (a ResizeObserver loop warning is
  the canonical example).
- Source maps, uploaded via `@sentry/vite-plugin` and tied to the same `release` string
  set in `init`, are what turn a minified stack trace back into your actual source —
  without a matching release tag, Sentry can't find the right map for a given error.

## Shipping your own telemetry

Not everything belongs in a vendor SDK — RUM metrics (lesson 49's Core Web Vitals),
custom business events, and a lightweight in-house monitor for a sandboxed or
privacy-sensitive context all need the same delivery mechanics:

- **`navigator.sendBeacon(url, data)`** queues a small POST that survives the page
  unloading, which `fetch` historically couldn't guarantee — the browser sends it even as
  the tab closes. `fetch(url, { keepalive: true })` is the modern alternative and, unlike
  `sendBeacon`, lets you set headers and read a response if the request completes before
  unload; both exist today and picking one is a tradeoff, not a strict upgrade.
- Flush on `visibilitychange` (when `document.visibilityState` becomes `'hidden'`), not
  `beforeunload` — mobile Safari and backgrounded tabs don't reliably fire `beforeunload`,
  but `visibilitychange` fires whenever the tab is about to be backgrounded or closed, which
  is the actual moment you need to get data out the door.
- **Sampling** trades completeness for volume/cost: a `sampleRate` of `0.1` means roughly
  1 in 10 sessions or errors gets reported. For this to be testable, drive it from an
  injected random source (`random: () => number`) rather than `Math.random()` directly —
  the same technique you'd use to unit-test any sampling logic deterministically.
- **Deduplication** collapses repeat occurrences of the same error (same name, message,
  and stack) within a short window into one report with a count, instead of flooding your
  dashboard with 500 copies of one crash loop.

## Alerts, SLOs, and the incident loop

Useful frontend SLOs are almost always about *rate*, not raw count, because raw error
counts scale with traffic: **error rate** (errors per session or per pageview), **crash-free
session rate** (the release-health metric from the previous concept step), and **INP
p75** (lesson 49) as your interactivity SLO. Pair error monitoring with **synthetic
checks** (a scripted browser hitting key flows on a timer, independent of real traffic) and
a **status page** so "is it down" doesn't depend on someone happening to be looking at a
dashboard.

The loop that actually catches "did the deploy break it": tag every error with the release
identifier from the first concept step, mark every deploy as a vertical line ("deploy
marker") on your error-rate and latency dashboards, and alert on *spikes correlated with a
recent deploy marker*, not just absolute error rate. When that alert fires, the incident
runbook's first move is almost never "start debugging" — it's **check whether the change
is behind a flag, and kill the flag first**. That buys time to debug calmly with traffic
already reverted to known-good behavior, which is the entire reason the previous concept
step's flag-and-rollback machinery exists.

## Further reading

- [React: `createRoot`](https://react.dev/reference/react-dom/client/createRoot)
- [React: `<ErrorBoundary>` and catching render errors](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Sentry for React: getting started](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry: scrubbing sensitive data (`beforeSend`)](https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/)
- [web.dev: `sendBeacon` vs `fetch keepalive`](https://web.dev/articles/beacon-api)
