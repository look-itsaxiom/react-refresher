# Fix the resilient client

`resilient.go` in this step's folder has three bugs, marked with `TODO` comments, in
`Backoff.Delay`, `Do`, and `TokenBucket`. Fix them so `go test ./...` passes.

Run it yourself from `exercises-local/105-integrations-in-go/04-resilient-client/`:

```bash
go test ./...
```

## What's broken

1. **`Backoff.Delay` has no jitter and no cap.** It doubles `Base` every attempt forever.
   Fix it to implement **full jitter**: a value chosen uniformly at random between `0` and
   `min(Max, Base*2^attempt)`. Use `b.Rand()` for the random `[0, 1)` value (it's injected
   so tests are deterministic -- don't call `math/rand` directly).
2. **`Do` retries every request, including a non-idempotent one with no way for the server
   to recognize a repeat.** A `POST` (or any method that isn't inherently idempotent)
   should only be retried if the request carries an `Idempotency-Key` header. `Do` should
   also honor a `Retry-After` response header (parse it with the already-correct
   `ParseRetryAfter`) over the computed backoff delay, when the response has one.
3. **`TokenBucket` never refills.** It starts with `burst` tokens and never gets more.
   `Take` needs to add back `elapsed_seconds * rate` tokens (capped at `burst`) based on
   how much time has passed since the last refill, using the injected `now` clock.

## What `Do` must do, precisely

- Attempt the request up to `opts.MaxAttempts` times.
- Only retry when `opts.RetryOn(resp, err)` says so (defaults to network errors and
  429/503) **and** the request is safe to retry: an inherently idempotent method, or any
  method with a non-empty `Idempotency-Key` header.
- Before each retry after the first attempt, re-derive the request body from
  `req.GetBody()` (the original body reader has already been consumed).
- When retrying, sleep for `Retry-After` if the response set one and it parses; otherwise
  sleep for `opts.Backoff.Delay(attempt)`. Use `opts.Sleep` (defaults to a real
  context-aware timer).
- Stop immediately if the context is done, returning a `*RetryError` wrapping
  `ctx.Err()`.
- On final failure, return a `*RetryError` (retrievable with `errors.As`) with `Attempts`
  set to the number of requests actually sent.

`ParseRetryAfter`, `Options`, `RetryError`, and the retry/idempotency helper functions are
already correct -- you're only fixing `Backoff.Delay`, `Do`'s retry-safety and
`Retry-After` handling, and `TokenBucket`.
