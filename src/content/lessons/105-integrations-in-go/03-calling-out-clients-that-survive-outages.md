# Calling out: clients that survive other people's outages

The other half of an integrations job is the opposite direction: your service calling a
vendor's, a partner's, or another team's API, and that call failing in every way HTTP calls
fail -- timeouts, 5xx, connection resets, rate limits -- on infrastructure you don't
control and can't fix. The goal here isn't to make failures impossible; it's to make them
survivable, and to make the failures you can't survive loud and legible instead of silent.

## Start with an explicit client

`http.DefaultClient` has no timeout. A hung TCP connection to a slow or wedged upstream
will block your goroutine forever, and if that goroutine is handling a request, the
request hangs forever too. Every outbound call in a service needs an explicit `*http.Client`
with a timeout, and in most services that client should be shared (constructed once, reused
across calls) rather than built fresh per request -- a fresh `http.Transport` per call
means no connection reuse, which means a full TCP and TLS handshake on every single
request.

```go
var client = &http.Client{
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
	},
}
```

`Timeout` here bounds the whole round trip (connect, write, read, redirects). For finer
control per call -- "this one request gets 2 seconds, not 10" -- use `context.WithTimeout`
on the request's context instead of a second client; lesson 104 covers deadline propagation
in depth, and everything there applies directly to outbound calls.

## Retry only what's safe to retry

A dropped response doesn't tell you whether the server actually did the work. Your POST to
charge a card might have failed before the server received it, or the server might have
processed it and the *response* got lost on the way back to you. Retrying blindly risks a
double charge. The rule: retry **idempotent** requests freely (GET, HEAD, PUT, DELETE --
methods HTTP itself defines as safe to repeat), and retry non-idempotent requests (POST,
PATCH) only when you've given the *server* a way to recognize a repeat: an
`Idempotency-Key` header the server stores against the result of the first attempt, so a
retry with the same key returns the original result instead of doing the work twice.
Stripe's API popularized this exact pattern and most modern payment and messaging APIs
follow it. Generate the key once per logical operation (not per HTTP attempt) and reuse it
across retries of that same operation.

## Exponential backoff with full jitter

Retrying immediately after a failure just hits the same overloaded or recovering server
again, often from many clients at once. The standard fix is exponential backoff: wait
longer after each successive failure. But naive exponential backoff -- every client
computing the exact same delay from the same attempt count -- creates a *thundering herd*:
all of them retry in near-perfect sync, which can look to the server like a second spike
right as it's recovering from the first one. AWS's well-known writeup on this ("Exponential
Backoff And Jitter") walks through several jitter strategies and lands on **full jitter** --
pick the delay uniformly at random between zero and the capped exponential value -- as the
one that best spreads retries out and reduces total work done across all clients.

```go
func (b Backoff) Delay(attempt int) time.Duration {
	cap := min(b.Max, b.Base<<attempt)
	return time.Duration(rand.Float64() * float64(cap))
}
```

The cap matters as much as the jitter: without `Max`, a client that's been failing for a
while computes a delay measured in minutes or hours, which is rarely what you want -- you'd
rather fail the caller sooner and let a higher-level retry or a human decide.

## Retry-After and 429/503

RFC 9110 defines `Retry-After` for exactly this situation: a server tells you how long to
wait before trying again, either as a number of seconds or an HTTP-date. RFC 6585 defines
`429 Too Many Requests` for rate limiting specifically (distinct from `503 Service
Unavailable`, which usually means "overloaded" or "down for maintenance" rather than "you
personally are over your limit"). When a response carries `Retry-After`, honor it over your
own computed backoff -- the server has information you don't (exactly when its rate-limit
window resets, or exactly how long its maintenance will take), and ignoring it just means
you'll get rate-limited again on your very next attempt.

```go
if ra := resp.Header.Get("Retry-After"); ra != "" {
	if d, ok := ParseRetryAfter(ra, now()); ok {
		delay = d // overrides the computed backoff
	}
}
```

## Budgets and circuit breakers

Backoff and retry answer "how do I recover from one failure." They don't answer "when do I
stop trying this vendor altogether for a while." A **retry budget** caps the total time (or
attempt count) a single logical operation is allowed to spend retrying before it gives up
and surfaces an error to its own caller -- without a budget, a deeply nested call chain
where every layer retries independently can turn one slow dependency into a multi-minute
hang, multiplied at each layer. A **circuit breaker** goes further: after enough recent
failures against a given upstream, it stops sending requests to it entirely for a cooldown
period, failing fast instead of queuing more doomed attempts (and giving the struggling
upstream room to recover instead of more load). This lesson doesn't build a full breaker --
that's naturally scoped as its own exercise -- but the shape is worth knowing before you
need it: a small state machine (closed → open → half-open) wrapping your client, tracking a
rolling failure rate.

## Rate limiting on your side

Being a good citizen of someone else's API means not just handling *their* rate limit but
sometimes enforcing your *own*, proactively, before you hit theirs. Three common shapes:

- **Token bucket.** A bucket holds up to `burst` tokens and refills continuously at `rate`
  tokens/second. Each request costs one (or more) tokens; if the bucket's empty, the
  request waits or is rejected. Bursts up to the bucket size are allowed, which matches how
  real traffic actually arrives (rarely perfectly smooth).
- **Leaky bucket.** Requests join a fixed-size queue and are processed off it at a constant
  rate, smoothing bursts into a steady output rate rather than allowing them through.
- **Sliding window.** Counts requests in a moving time window (the last 60 seconds, say)
  rather than a fixed calendar window, avoiding the edge case where a fixed window resets
  right as you're bursting and lets through 2x your intended rate across the boundary.

In production Go code, reach for `golang.org/x/time/rate`, which implements a token bucket
limiter (`rate.NewLimiter(r, b)`) with context-aware waiting built in. This lesson's
exercise hand-rolls a token bucket instead, because building the thing once by hand is what
makes reaching for the library version later actually make sense.

For a product with multiple customer organizations sharing one integration (this job
posting's whole premise), a single global rate limit isn't enough -- one noisy tenant
shouldn't be able to exhaust the budget every other tenant needs. That means a limiter *per
tenant* (keyed by organization ID), not one shared instance, so `map[orgID]*TokenBucket`
guarded by its own mutex, or a limiter backed by a shared store (Redis) if the limit needs
to hold across multiple service instances rather than per-process.

## Context deadlines end to end

A deadline only protects you if it's attached to every step of the chain. If your handler
has a 5-second deadline from its caller but you build outbound requests with
`context.Background()` instead of deriving from the handler's context, that outbound call
can run long after the original caller has given up and moved on -- you're doing wasted
work for a response nobody's waiting for anymore. Thread the context through:
`req = req.WithContext(ctx)` (or build the request with `http.NewRequestWithContext(ctx,
...)` in the first place) so a caller's cancellation propagates all the way to the actual
socket read.

## Observability of the contract

When an integration breaks, "the API call failed" is not a useful log line at 2am. What you
actually need to reconstruct what happened:

- **Per-attempt logs**: a request ID (yours, so you can trace one logical operation across
  retries), the upstream's status code, which attempt number this was, and the latency.
- **Metrics**: a counter for retries (by vendor, by reason) and for 429/503 responses
  specifically -- a rising rate of either is an early warning that a vendor relationship is
  degrading before it becomes a full outage.
- **Structured errors that name the vendor.** `fmt.Errorf("payments API: %w", err)` at the
  point where you know which vendor failed is worth far more three services later than a
  bare "request failed" that's lost that context by the time it's logged.

`log/slog` from lesson 104 is the right tool for all of this: structured fields for
request ID, attempt, status, and latency, at a level (`Warn` for a retry, `Error` for
exhausting all retries) that lets you alert on the right thing without paging on every
transient blip.

## Contract tests against third-party APIs

A live third-party API is a dependency you don't control and shouldn't hit in your regular
test suite -- it's slow, it costs money in some cases, and it changes on someone else's
schedule. The common pattern is **recorded fixtures**: capture a real request/response pair
once (by hand, or with a recording proxy), commit it, and replay it in tests via an
`httptest.Server` that serves the recorded response. That gets you fast, deterministic
tests of your own retry/parsing/error-handling logic. Separately, run a small number of
actual **contract tests** against the real API on a schedule (not on every commit) whose
only job is to catch the vendor changing their response shape out from under you before
your users do.

## Further reading (optional)

- IETF, [RFC 9110 §10.2.3, Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after) --
  the seconds-or-HTTP-date grammar.
- IETF, [RFC 6585 §4, 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585#section-4).
- AWS Architecture Blog, ["Exponential Backoff And Jitter"](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) --
  full jitter and why naive exponential backoff creates a thundering herd.
- Stripe, ["Idempotent requests"](https://docs.stripe.com/api/idempotent_requests) -- the
  `Idempotency-Key` pattern this lesson's exercise mirrors.
- Go, [`golang.org/x/time/rate`](https://pkg.go.dev/golang.org/x/time/rate) -- the
  production token-bucket limiter to reach for once you've built one by hand.
