# Measuring React the right way

You've been fixing dependency arrays and memoizing components since React 16. The habit that hasn't kept pace is measurement: reaching for `useMemo` because a component "feels" expensive, or wrapping something in `React.memo` because it's in a loop, without ever confirming the render was the cost. As of React 19.3 and Chrome DevTools' current stable release, you have four ways to actually see what's happening, in increasing order of ceremony: `react-scan` for a live overlay, the DevTools Profiler tab for a recorded flamegraph, the Performance panel's Performance Tracks for React-in-context-of-everything-else, and the programmatic `<Profiler>` API for anything you want to assert on in code (including tests). Reach for whichever answers your actual question — don't record a full Performance trace to answer something a two-minute `react-scan` session would show you.

## What a re-render actually costs

A re-render is not automatically a problem. React re-rendering a component means calling its function again, diffing the returned tree against the previous one, and — only where the diff finds a difference — writing to the real DOM. The function call and the diff are usually cheap; a component that renders a `<span>{count}</span>` costs nothing measurable even at hundreds of re-renders a second. The cost shows up in three specific places: a render function that does real work (sorting a large array, formatting every row of a table, running a regex over a big string), a subtree wide or deep enough that the diff itself takes time even when nothing changed, and layout/paint cost when the DOM actually gets touched (a class toggle that triggers a reflow, an animation restarting). "This component re-renders a lot" and "this re-render is expensive" are different claims — always check which one you're making before reaching for a fix.

## The DevTools Profiler workflow

React DevTools ships a **Profiler** tab (separate from the Components tab) with a workflow built for exactly this: click record, perform the interaction you're worried about, stop recording. You get:

- **A commit list** across the top — one bar per commit, height roughly proportional to render duration, so you can spot the commit that's an outlier.
- **A flamegraph** per commit — every component that rendered in that commit, sized by render time, colored by relative cost (gray means it didn't re-render that commit at all — DevTools still shows it, just flattened).
- **"Why did this render?"** on a selected component — DevTools tells you whether it was a changed prop, changed state, changed hook, a context update, or a re-render forced by the parent, without you needing to add console logs.

The workflow that matters: don't profile the whole app cold. Profile *one interaction* — one keystroke, one click, one route change — and look at the commit(s) it produced. If a single keystroke in a search box produces a commit where a chart component you didn't touch shows up in the flamegraph, that's your bug, found in under a minute.

## `actualDuration` vs `baseDuration`, and the 19.2 Performance Tracks

Both the DevTools Profiler and the programmatic `<Profiler>` report two durations per component per commit, and confusing them is a common mistake:

- **`actualDuration`** — how long this render actually took, this commit, including children. Includes any memoization savings: a component that bailed out via `React.memo` contributes ~0 here.
- **`baseDuration`** — an estimate of how long the subtree would take to render *from scratch*, ignoring memoization. This is what you'd pay if every optimization were removed.

A component with a huge `baseDuration` but a tiny `actualDuration` is a memoization success story — expensive to build, but currently paying almost nothing because it isn't rebuilding. Watch `actualDuration` climb toward `baseDuration` over time and you've found a regression: something that used to bail out no longer does.

React 19.2 added **Performance Tracks**: custom lanes in Chrome DevTools' own Performance panel (not the separate React DevTools extension), visible in any recorded trace without extra setup. Two tracks matter:

- **Scheduler** — React's internal priority lanes (Blocking, Transition, Suspense, Idle) as colored bars, so you can see whether work you expected to be low-priority (a transition) is actually landing on the blocking lane.
- **Components** — the component tree React is working through for that commit, with labels like "Mount" and "Blocked" (blocked meaning React yielded to higher-priority browser work mid-render).

The advantage over the React DevTools Profiler is context: you see React's work interleaved with actual browser work — style recalculation, layout, paint, other JavaScript — on the same timeline. A render that's fast in isolation but triggers an expensive synchronous layout read (`getBoundingClientRect` in a loop) shows up here as a slow *frame*, even though React DevTools would report a fast commit.

## `react-scan` for a five-second sanity check

[`react-scan`](https://react-scan.com/) is a standalone tool (not a React or DevTools feature) that overlays a live highlight on every component as it re-renders, with zero code changes for a quick session (`npx react-scan@latest <url>`, or an npm install for a persistent dev-mode overlay). It answers "is *anything* over-rendering right now" faster than opening the Profiler, because it's ambient — you don't have to guess which interaction to record first. Use it to find *where* to look; use the Profiler or Performance Tracks to confirm *why* and *how much*.

## The programmatic `<Profiler>`

```tsx
import { Profiler } from 'react';

<Profiler
  id="dashboard"
  onRender={(id, phase, actualDuration, baseDuration, startTime, commitTime) => {
    // phase is 'mount' or 'update'
    reportToAnalytics({ id, phase, actualDuration });
  }}
>
  <Dashboard />
</Profiler>
```

`onRender` fires once per commit for the wrapped subtree — this is real production instrumentation, not a dev-only tool, so teams use it to feed a dashboard of real-user render costs. It's also how this lesson's own exercise checks grade your fix: they wrap your component in a `<Profiler>` and count commits and phases. One caveat for testing specifically: `actualDuration` and `baseDuration` in jsdom are not meaningful — jsdom doesn't do real layout, so treat them as noise there and grade on **commit count** and **phase** instead, which are stable regardless of environment.

## Further reading (optional)

- [Profiler API reference](https://react.dev/reference/react/Profiler)
- [React DevTools Profiler introduction](https://legacy.reactjs.org/blog/2018/09/10/introducing-the-react-profiler.html)
- [React 19.2 release notes (Performance Tracks)](https://react.dev/blog/2025/10/01/react-19-2)
- [react-scan](https://react-scan.com/)
