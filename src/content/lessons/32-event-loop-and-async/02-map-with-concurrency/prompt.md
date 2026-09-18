Implement:

```ts
type ConcurrencyOptions = {
  limit: number;
  signal?: AbortSignal;
  settle?: boolean;
};

function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  options: ConcurrencyOptions,
): Promise<R[]>
```

`mapWithConcurrency` runs `fn` over every item, like `Promise.all(items.map(fn))`, but
never starts more than `options.limit` calls to `fn` at once — the next item only starts
once an earlier one finishes. The returned array is in **input order**, regardless of which
calls finish first.

Failure and cancellation, precisely:

1. **Default (no `settle`): fail fast.** The moment any `fn(item, index)` call rejects,
   `mapWithConcurrency` rejects with that same error, without waiting for the rest — the
   same contract `Promise.all` has. Calls already in flight keep running in the background;
   don't let any of them produce an unhandled rejection.
2. **`settle: true`: wait for everything, then report every failure together.** Every item
   still gets its chance to run (including ones not yet started when an earlier one fails).
   If none failed, resolve with the full results array. If one or more failed, reject with
   an `AggregateError` whose `.errors` array holds every failure, in item order.
3. **Abort.** If `options.signal` is already aborted, or becomes aborted while work is in
   flight, reject immediately with an error whose `name` is `'AbortError'` — don't start any
   item that hasn't started yet, and don't wait for in-flight ones to finish before
   rejecting. In-flight calls that were already running should still be allowed to settle
   quietly in the background (again: no unhandled rejections), even though their results
   are discarded.

`App.tsx` renders a button that calls `mapWithConcurrency` over a small list using a
provided `@server`-style async function and shows the results, so you can watch it run by
hand — the checks don't depend on the UI.
