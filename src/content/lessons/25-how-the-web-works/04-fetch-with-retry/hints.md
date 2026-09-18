Structure this as a loop, not recursion — recursion works too, but a `while (true)` with a mutable
`attempt` counter is easier to reason about when you also need to check `signal.aborted` on every
iteration, not just once at the start.

---

Order of checks inside the loop body matters. Before calling `fn()`, bail out immediately if
`signal?.aborted`. After `fn()` rejects: first check `err instanceof ClientError` (never retry
that, no matter how many retries are left), then check whether `attempt >= retries` (out of
budget, rethrow the real error) — only after both of those should you compute a delay and wait.

---

For the delay itself, you need a promise that resolves after `ms` milliseconds *or* rejects the
moment `signal` fires an `'abort'` event, whichever comes first — a bare `setTimeout` wrapped in a
promise can't be interrupted early. Something like:

```ts
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
```

---

The backoff math: `const exponential = baseDelayMs * 2 ** attempt;` then
`const capped = Math.min(exponential, maxDelayMs ?? Infinity);` then multiply by a random factor
in `[0.5, 1)` (or any range you like — the checks only care that failures eventually recover and
that a tiny `maxDelayMs` keeps the wait short, not the exact jitter formula). `attempt` starts at
`0` and increments only after a retryable failure, so the very first call to `fn()` never waits.
