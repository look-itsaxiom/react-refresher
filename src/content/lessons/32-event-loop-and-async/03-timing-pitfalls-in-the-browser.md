# Timing pitfalls in the browser

The event loop mechanics from [Lesson 26](/) — tasks, microtasks, rendering opportunities —
explain *why* the pitfalls below happen. This step is the pitfall list itself: the specific
ways `async` code interacts badly with a real browser tab, and the React 19 detail that
changes how you write cancellable effects.

## Microtask starvation

Draining the microtask queue happens before anything else gets a turn — not just before the
next task, but before the browser can paint. A promise chain that keeps re-queuing more
microtasks (a `.then()` that schedules another `.then()`, recursively, with no task-queue
hop in between) can starve rendering and input handling indefinitely, because "wait for the
microtask queue to empty" never actually happens. This is rare to write by accident in
application code, but it's exactly why `queueMicrotask()` is not a substitute for
`scheduler.yield()` or a `MessageChannel`-based yield when you're chunking real work —
covered in Lesson 26's event-loop step, not repeated here.

## `await` inside a loop: sequential by default, and that's often wrong

```ts
// Sequential: each fetch waits for the previous one to fully resolve first.
for (const id of ids) {
  results.push(await fetchUser(id));
}

// Parallel: every fetch starts immediately; you wait for all of them together.
results = await Promise.all(ids.map((id) => fetchUser(id)));
```

The sequential form is correct when each iteration genuinely depends on the last one's
result (paginating with a cursor, retrying with backoff). It's a silent performance bug
when the iterations are independent — ten sequential 100ms requests costs a full second
that ten parallel ones wouldn't. The reverse mistake is just as real: firing everything in
parallel with no limit is what this lesson's first exercise (`mapWithConcurrency`) exists
to fix, and `array.forEach(async (x) => await f(x))` is worse than either — `forEach`
doesn't await its own callback, so it fires all calls immediately *and* returns before any
of them settle, silently dropping any error the callback throws into an unhandled
rejection. `for...of` with `await`, or `Promise.all`/`allSettled` with `.map`, are the two
real choices; `forEach` with `async` is never correct.

## Timer clamping and background-tab throttling

Browsers clamp nested `setTimeout` calls to a roughly 4ms minimum once you're five or more
levels deep in synchronously-nested timeouts — a decades-old throttling rule that rarely
matters at typical intervals, but explains why a tight `setTimeout(fn, 0)` polling loop
doesn't actually run every "0ms." Far more consequential in practice: a **backgrounded tab**
gets its timers throttled to at most once per second (and Chrome intermittently freezes
backgrounded tabs' timers entirely under memory pressure), specifically to save battery and
CPU on tabs nobody's looking at. This course's own timer-based checks assume a foreground
tab for exactly this reason — a `sleep(50)` in a hidden tab might not resolve for a full
second. Production code polling or auto-refreshing on an interval should treat a
backgrounded tab as a reason to reduce or pause work (the Page Visibility API's
`document.visibilityState`), not fight the throttle.

## `setTimeout(0)` vs. `MessageChannel` vs. `scheduler.yield()` — the one-line recap

Lesson 26 covers this in full; the one-line version for async code specifically:
`queueMicrotask` never yields to the browser at all, `setTimeout(fn, 0)` yields but is
clamped, `MessageChannel` yields with no clamp and works everywhere today, and
`scheduler.yield()` is the purpose-built version of the same idea — Chrome and Edge only as
of September 2026, so it still needs a fallback in anything shipped broadly.

## `requestIdleCallback`, `structuredClone`, and the Web Locks API

- **`requestIdleCallback(fn)`** schedules `fn` to run during a browser idle period, with a
  `deadline.timeRemaining()` the callback can check to stop early — useful for genuinely
  low-priority work (analytics batching, prefetching) that should never compete with user
  input, but it's not Baseline in Safari and gives no guarantee about *when*, so nothing
  latency-sensitive should depend on it running soon.
- **`structuredClone(value)`** deep-clones most JS values (including `Map`, `Set`, typed
  arrays, and cyclic references) without JSON's lossy round-trip through strings. It shows
  up in async code specifically for snapshotting state before an optimistic update, so a
  failed request can roll back to an exact, independent copy rather than a reference that
  may have already been mutated elsewhere.
- **The Web Locks API** (`navigator.locks.request(name, async (lock) => { ... })`)
  coordinates work across multiple tabs or workers of the *same origin* that might race on
  a shared resource — refreshing an auth token, say, where you want only one tab to
  actually hit the network while the others await the same lock and then reuse the result.
  It's not a replacement for `AbortController`; it's a mutex for concurrent contexts,
  `AbortController` cancels one.

## React 19 Actions and `useTransition`: re-wrapping after `await`

React 19's `startTransition` accepts an async function directly, and `isPending` now stays
`true` for the whole duration of that function — not just until the first `await`, which is
what React 18 did. But there's a real gap in that improvement: **state updates that happen
after an `await` inside the transition function are not automatically re-associated with
the transition** — only the initial synchronous portion is tracked implicitly. If a `set`
call after an `await` needs to be treated as part of the same transition (so it doesn't
force a synchronous, blocking re-render), wrap it in its own `startTransition` call:

```tsx
function handleSubmit() {
  startTransition(async () => {
    const result = await save(formData); // tracked: isPending stays true through this
    startTransition(() => {
      setResult(result); // must be re-wrapped to stay non-blocking
    });
  });
}
```

The same shape applies to a React 19 `<form action={...}>` Action or `useActionState`: the
action function itself can be `async` and its pending state is tracked correctly, but any
`set` call you make after an internal `await`, outside of what the framework itself
manages, follows the same "re-wrap it" rule. This is a live gap in the API, not a stable
design decision — check the React changelog before assuming it's been resolved by the time
you're reading this.

## Further reading (optional)

- [MDN — Document: `visibilitychange` event](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)
- [MDN — `structuredClone()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
- [MDN — Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [react.dev — `startTransition`](https://react.dev/reference/react/startTransition)
