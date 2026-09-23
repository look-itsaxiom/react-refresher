For `Delay`: compute the exponential value first (`Base` doubled `attempt` times, capped at
`Max` -- watch out for overflow on large attempt counts, stop doubling once you'd exceed
`Max`), then multiply by `b.Rand()` (or `rand.Float64()` if `Rand` is nil) to land somewhere
in `[0, cap)`.

---

There's already an `isIdempotent(req *http.Request) bool` helper in the file that checks
the method and the `Idempotency-Key` header. Call it once, before the retry loop starts
(the method doesn't change between attempts), and require it to be true in addition to
`RetryOn` before retrying.

---

For `Retry-After`: after a response that's going to be retried, check
`resp.Header.Get("Retry-After")`. If it's non-empty, call `ParseRetryAfter(value,
opts.Now())` (falling back to `time.Now` if `opts.Now` is nil) and use that duration
*instead of* `opts.Backoff.Delay(attempt)` when it parses successfully.

---

For `TokenBucket.Take`: before checking whether enough tokens are available, compute
`elapsed := b.now().Sub(b.lastFill).Seconds()`, add `elapsed * b.rate` to `b.tokens`
(clamped to `b.burst`), and update `b.lastFill` to the current time. Do this inside the
same lock that guards the token check and decrement.

---

Full shape of the fixed `Take`: lock → refill based on elapsed time since `lastFill`
(capped at `burst`) → if `tokens >= n`, subtract `n` and return `true` → otherwise return
`false`. `Allow()` is just `Take(1)`.
