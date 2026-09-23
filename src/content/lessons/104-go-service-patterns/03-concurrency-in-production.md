# Concurrency in production

102 introduced goroutines, `WaitGroup`, and channels as primitives. This is what you build
with them once a goroutine's job is "handle production traffic" instead of "finish a toy
example" -- pools that don't spawn unboundedly, shutdowns that don't drop requests, and
the tools for noticing when either one is broken.

## Worker pools

An unbounded `go handle(job)` per incoming job is fine for a handful of jobs and a
liability for a queue with bursts -- every job gets its own goroutine and its own share
of whatever resource it touches (DB connections, memory, file handles), with nothing
capping the total. A worker pool fixes the count: a fixed number of goroutines pull from
a shared jobs channel, so concurrency is bounded by `workers`, not by how many jobs
arrived.

```go
func RunPool(ctx context.Context, jobs <-chan Job, workers int, handle func(context.Context, Job)) {
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case job, ok := <-jobs:
					if !ok {
						return
					}
					handle(ctx, job)
				}
			}
		}()
	}
	wg.Wait()
}
```

Two rules make this safe: **exactly one goroutine closes a channel** (usually the
producer, once), and **every worker has a way out** -- either the channel closes, or
`ctx.Done()` fires. A worker with neither is the one goroutine leak pattern that matters:
it sits blocked forever, pinned in memory, invisible until someone notices
`runtime.NumGoroutine()` climbing.

**Fan-out/fan-in** is the same shape generalized: fan out work across N goroutines
reading one input channel, fan in their output onto one results channel (or, as in the
exercise below, write results directly into a pre-sized slice by index -- simpler than a
results channel when you already know how many results there will be and want them back
in a specific order).

**Backpressure** falls out of channel capacity. An unbuffered channel forces the
producer to wait for a consumer to be ready; a small buffer (`make(chan Job, 32)`) lets
the producer stay a little ahead without unbounded queueing in memory. Size the buffer to
the burst you actually expect, not "big enough to never block" -- an unbounded buffer
just moves the memory problem from "too many goroutines" to "too many buffered jobs."

**`golang.org/x/sync/errgroup`** is worth knowing by name even though the exercises here
use plain `WaitGroup` and channels: it bundles a `WaitGroup` with automatic context
cancellation (the first error cancels a shared context so siblings can stop early) and
propagates the first non-nil error back to the caller. Reach for it once a pool's error
handling and cancellation plumbing gets repetitive to hand-write.

Other primitives that show up around pools: `sync.Once` for exactly-once initialization
shared across goroutines (a connection pool's first-use setup, for instance), and
`time.Ticker` for a goroutine that does something on an interval -- always paired with
`ticker.Stop()` (usually `defer`) and a `select` on `ticker.C` alongside `ctx.Done()`, so
the loop has the same "way out" every other long-lived goroutine needs.

## Graceful shutdown

A process that just exits on `SIGTERM` drops every request it was mid-handling. The fix
is a specific order, and skipping a step is where the bugs live:

1. **Stop accepting new work.** For an HTTP server, that's `http.Server.Shutdown(ctx)`:
   it closes the listener immediately (no new connections), then waits for in-flight
   requests to finish -- up to whatever deadline `ctx` carries -- before returning.
   Calling `Shutdown` makes the paired `Serve`/`ListenAndServe` call return
   `http.ErrServerClosed`, which is the *expected* signal that shutdown happened, not an
   error to propagate to whoever's waiting on your process's exit code.
2. **Drain.** Requests already in flight when `Shutdown` was called get to finish. This is
   why `ShutdownTimeout` needs to be at least as long as your slowest expected request --
   too short, and `Shutdown` returns your context's deadline error with requests still
   running, having done half a graceful shutdown.
3. **Close dependencies**, after the drain: DB pools, message queue connections, anything
   a still-draining request might still touch. Close them before the drain and you turn a
   graceful shutdown into the exact outage you were trying to avoid.

`signal.NotifyContext(parent, os.Interrupt, syscall.SIGTERM)` (standard library since Go
1.16) is the standard entry point: it returns a context that's cancelled the moment one
of the given signals arrives, so "shut down" becomes "the same `ctx.Done()` every other
cancellable function already watches" instead of a separate signal-handling goroutine you
write by hand:

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()
// ... run the server until ctx is Done, then Shutdown ...
```

**Readiness vs. liveness** (the Kubernetes vocabulary, but the distinction matters
without k8s too): liveness asks "is the process alive" -- fail it and the platform
restarts the process, so it should only fail when restarting would actually help.
Readiness asks "should traffic be routed here right now" -- fail it during a slow
startup, a dependency outage, or (the case in the exercise below) the drain phase of a
shutdown, so a load balancer stops sending new requests to an instance that's on its way
out, without killing requests already in flight.

## Watching for problems

The **race detector** (`go test -race`, `go build -race`) instruments every memory
access and reports data races -- concurrent, unsynchronized access to the same memory
where at least one side writes -- as they happen, not as flaky test failures you have to
reproduce later. It's standard in CI for any package with goroutines; the tradeoff is
runtime and memory overhead, which is why it's a CI/test-only flag, not something you'd
run in production.

Two lightweight standard-library packages help once something's already running: `net/http/pprof`,
imported for its side effect (`import _ "net/http/pprof"`), exposes CPU and heap
profiles over HTTP for `go tool pprof` to pull from a live process — mount it on an
internal-only port. `expvar` publishes arbitrary counters and gauges as JSON at `/debug/vars`
— cheap, unauthenticated by default, so it belongs behind the same internal-only
boundary as pprof, not on the public listener.

## Interview answer: structuring a webhook processor

A common system-design prompt for this stack: *"How would you structure a Go service
that processes webhooks from vendors?"* The shape this lesson built points at the answer
directly: an HTTP handler (103) does the minimum to accept the request -- verify the
signature, decode the envelope, return `202` fast -- then hands the payload to a bounded
worker pool (this lesson) that does the actual processing with retries and backoff
(105's territory). `context.WithTimeout` bounds each unit of work, `slog` logs one line
per webhook with its outcome, and `signal.NotifyContext` plus `http.Server.Shutdown`
mean a deploy drains in-flight webhooks instead of silently dropping them. The specifics
of idempotency keys, retry/backoff, and rate limiting are 105 -- this lesson is the
scaffolding they plug into.

## Further reading (optional)

- [os/signal: NotifyContext](https://pkg.go.dev/os/signal#NotifyContext)
- [net/http: Server.Shutdown](https://pkg.go.dev/net/http#Server.Shutdown)
- [context: AfterFunc](https://pkg.go.dev/context#AfterFunc)
- [golang.org/x/sync/errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup)
- [Go blog: Race Detector](https://go.dev/blog/race-detector)
