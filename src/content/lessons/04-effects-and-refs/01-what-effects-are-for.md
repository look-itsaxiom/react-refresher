# What effects are actually for

An effect is not "code that runs after render." It is a way to **synchronize a component with a system that lives outside React**: the DOM, a subscription, a timer, a WebSocket, `document.title`, a third-party widget. If nothing outside React is involved, you almost certainly want a different tool — an event handler, a derived value, or nothing at all. The next lesson step covers that half. This one is about the effects that genuinely earn their place.

## The third phase: trigger, render, commit, *then* effects

You already know the render/commit split: React calls your component (render), then applies the minimal DOM changes (commit). Effects are a third phase, and the ordering matters:

```tsx
function VideoPlayer({ isPlaying }: { isPlaying: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isPlaying) ref.current?.play();
    else ref.current?.pause();
  }); // no dependency array: runs after every commit

  return <video ref={ref} />;
}
```

By the time this effect runs, the `<video>` element already exists in the DOM — render and commit are done. `useEffect` schedules its callback to run **after the browser has painted**, asynchronously, so it never blocks the frame the user sees. That is deliberate: most synchronization work (subscribing, logging, syncing a title) doesn't need to happen before paint. When it does — measuring a layout before the user sees a flicker — that is what `useLayoutEffect` is for; more on that niche in the refs step.

## Cleanup ties a resource's lifetime to the component's

An effect that starts something external almost always needs to stop it too:

```tsx
useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id); // cleanup
}, []);
```

React calls the returned cleanup function before running the effect again (when a dependency changed) and one final time on unmount. Forgetting cleanup is the single most common effect bug: leaked subscriptions, timers that outlive the component, event listeners that pile up. If your effect subscribes to anything, ask "what closes this?" before you ship it.

## StrictMode double-invokes on purpose

In development, React 19 still mounts a component, runs its effects, cleans them up, and runs them again — for every component, every time, whether or not `StrictMode` "looks" like it's testing anything specific. This is not a bug in your app or a bug in React; it exists to surface exactly the cleanup gap above. An effect that subscribes without a matching unsubscribe will visibly double its subscriber count under StrictMode. Effects that are properly idempotent (subscribe → unsubscribe → subscribe again, ending in the same state) are unaffected. Production builds only run effects once.

## Why "fetch in a `useEffect`" fell out of favor

For years the default data-fetching pattern was:

```tsx
useEffect(() => {
  fetch(`/api/users/${id}`).then((r) => r.json()).then(setUser);
}, [id]);
```

This has real problems, not stylistic ones:

- **Race conditions.** If `id` changes before the first request resolves, both responses can land, in either order, and the stale one can overwrite the fresh one. Fixing it correctly needs an ignore-flag or `AbortController` in every single effect that fetches.
- **Waterfalls.** The child doesn't start fetching until it has mounted, which means until its parent has already rendered and, often, finished its own fetch. Nested data dependencies serialize instead of running in parallel.
- **No cache, no dedup.** Two components fetching the same URL fire two requests. Navigating back to a page refetches everything from scratch.

None of this means effects are wrong for network I/O in general — it means "fetch as a side effect of rendering, coordinated by hand" is the wrong default. As of September 2026, the usual replacements are:

- **A query library** (TanStack Query, or a framework's built-in equivalent) for client-driven fetching, caching, dedup, and cancellation — it still uses effects internally, but it has already solved the race-condition and cache problems for you.
- **Suspense with the `use` hook**, which lets a component read a promise (or context) directly during render and lets a `<Suspense>` boundary above it show a fallback — no effect, no loading-state variable to manage by hand.
- **Route loaders**, in React Router 8 or as Next.js 16 Server Components, which fetch *before* the component renders at all, eliminating the waterfall entirely because data-fetching is no longer tied to a child's mount.

Effects are still the right tool for the problems this step opened with — subscriptions, DOM measurements, imperative APIs you don't control. They're the wrong tool for "get data and put it in state," and that distinction is worth internalizing before the next step, which is about the even more common mistake: reaching for an effect when you don't need one at all.

## Further reading

- [Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [Lifecycle of Reactive Effects](https://react.dev/learn/lifecycle-of-reactive-effects)
- [`use`](https://react.dev/reference/react/use)
- [TanStack Query docs](https://tanstack.com/query/latest)
