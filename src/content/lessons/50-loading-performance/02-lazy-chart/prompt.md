This dashboard has two tabs, "Overview" and "Chart". `Chart.tsx` is a stand-in for an
expensive charting library — it sets `window.__chartLoads` when its module body runs, so
you (and the checks) can tell exactly when it gets evaluated. Right now `App.tsx` imports
it statically at the top of the file, so it's in the initial bundle and evaluates
immediately, even though most sessions never open the Chart tab.

Split it out and load it lazily, then make switching to it feel instant:

1. Replace the static `import Chart from './Chart'` with `React.lazy(() =>
   import('./Chart'))`.
2. Wrap the part of the tree that renders the active tab in `<Suspense fallback={...}>`
   so the lazy chunk loading doesn't crash the render.
3. On the "Chart" tab button's `onMouseEnter`, call the lazy loader function you get back
   from step 1 directly (it's a plain function that returns a promise — calling it starts
   the fetch and caches the result; you don't need to do anything with the returned
   promise). This warms the chunk before the user clicks.
4. Wrap the `setActiveTab` call in the tab button's `onClick` with `startTransition` so
   the currently visible tab stays on screen while the Chart chunk (if it wasn't already
   warmed) loads, instead of the whole area flashing to the Suspense fallback.

The starter's `Tab` type and tab-switching UI already work; you're changing how `Chart`
is imported and when it starts loading, not the tab structure itself.
