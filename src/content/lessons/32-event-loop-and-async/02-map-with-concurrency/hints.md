Structure it as a fixed-size pool of `limit` "workers," each an async function that loops:
pull the next unclaimed index (a shared `nextIndex` counter, incremented before use so two
workers never claim the same one), call `fn` on it, store the result, then loop back to
claim another index until none are left. Start `Math.min(limit, items.length)` of these
workers with `void worker()` (or push them into an array) and resolve/reject the outer
promise from inside the loop bodies, not by awaiting the workers in the caller — you need to
be able to settle the outer promise *before* every worker has finished, for both fail-fast
and abort.

---

For fail-fast (no `settle`): keep a `settled` flag. The first time any worker's call to
`fn` rejects, if `settled` is still false, set it and call the outer `reject` immediately
with that error. Every other rejection (from calls already in flight) should still be
caught inside the worker — `.catch(() => {})` after you've decided it doesn't matter anymore
— so it never becomes an unhandled rejection.

---

For `settle: true`: don't reject early on a single failure. Instead, catch each failure
into an `errors: unknown[]` array (in index order — an array pre-sized to `items.length`
works, filtered for `undefined` slots at the end) and let every worker keep claiming
indices until none remain. Only once all workers finish, resolve with `results` if
`errors` is empty, or reject with `new AggregateError(errors)` otherwise.

---

For abort: check `signal?.aborted` before claiming each new index — if aborted, that worker
should stop claiming and return without starting `fn`. Separately, attach one
`signal.addEventListener('abort', ...)` (once, outside the workers) that immediately
rejects the outer promise with `new DOMException('Aborted', 'AbortError')` the moment abort
fires, regardless of what workers are doing — don't wait for them. Remove that listener once
the outer promise has settled through any path, so it doesn't fire again afterward.

---

Putting the pieces together, a worker body looks roughly like:

```ts
async function worker() {
  while (true) {
    if (aborted || settled) return;
    const index = nextIndex++;
    if (index >= items.length) return;
    try {
      results[index] = await fn(items[index], index);
    } catch (err) {
      if (options.settle) {
        errors[index] = err;
      } else if (!settled && !aborted) {
        settled = true;
        reject(err);
      }
    }
  }
}
```

with a final `Promise.allSettled(workers)` after starting them, whose own `.then` is where
you resolve for the success and `settle: true` cases (checking `errors` for any entries).
