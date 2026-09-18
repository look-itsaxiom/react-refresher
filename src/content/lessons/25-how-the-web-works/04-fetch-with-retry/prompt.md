`request(id)` below wraps `@server/users`' `fetchUser` and counts every attempt in the exported
`attempts` counter. It also throws a `ClientError` synchronously for an invalid id — standing in
for a real `4xx` response, the kind of failure retrying can never fix. Everything else it throws
(including whatever the simulated server rejects with) stands in for a transient, retryable
failure — a `5xx`, a dropped connection, a timeout.

Implement:

```ts
type RetryOptions = {
  retries: number;
  baseDelayMs: number;
  maxDelayMs?: number;
  signal?: AbortSignal;
};

function fetchWithRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T>
```

`fetchWithRetry` calls `fn()` and, on failure, retries according to `options`:

1. **Exponential backoff with jitter.** The delay before attempt *n* (0-indexed) should grow
   roughly as `baseDelayMs * 2^n`, with some randomness added so that many clients failing at once
   don't all retry in lockstep — a fixed delay would cause exactly that "thundering herd." Cap the
   delay at `maxDelayMs` when provided (default: no cap).
2. **No retry on a client error.** If `fn()` rejects with an instance of the exported `ClientError`,
   `fetchWithRetry` should reject immediately with that same error — retrying a request that's
   wrong by construction just wastes time and hammers the server for nothing.
3. **Give up after `retries` retries.** `retries: 0` means "try once, don't retry." Once the retry
   budget is exhausted, reject with whatever error the last attempt produced.
4. **Abort support.** If `options.signal` is already aborted, or becomes aborted while
   `fetchWithRetry` is waiting between attempts, reject immediately with an error whose `name` is
   `'AbortError'` — don't wait out the rest of the current delay first.

Don't change `request`, `ClientError`, or `attempts` — the checks read them directly. `App.tsx`
renders a button that calls `fetchWithRetry(() => request(1), { retries: 3, baseDelayMs: 200 })`
and shows the result, so you can watch it recover from a simulated failure by hand (use the
sandbox's "simulate server failure" control if the preview exposes one, or just trust the checks).
