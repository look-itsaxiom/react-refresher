Implement graceful shutdown for an HTTP server: serve until told to stop, then drain
in-flight requests instead of dropping them.

## Types (already declared for you)

```go
type Readiness struct { /* ... */ }
func (r *Readiness) SetReady(ready bool)
func (r *Readiness) Handler() http.Handler // 200 {"ready":true} or 503 {"ready":false}

type Server struct {
	HTTP            *http.Server
	Logger          *slog.Logger
	ShutdownTimeout time.Duration
	Ready           *Readiness // optional; nil means "no readiness probe to flip"
}
```

`Readiness` and its methods are complete — you don't need to touch them, only call
`SetReady` at the right moment from `Run`.

## `Run(ctx context.Context, s *Server, ln net.Listener) error`

- Log a `"starting"` record via `s.Logger` with an `"addr"` attribute (`ln.Addr().String()`),
  then serve on `ln` (`s.HTTP.Serve(ln)`).
- **Block until `ctx` is cancelled.** Requests must keep being served normally the whole
  time — `Run` should not return, and no shutdown should begin, before that.
- Once `ctx` is done:
  1. If `s.Ready` is non-nil, call `s.Ready.SetReady(false)` — flip it to not-ready
     *before* shutting down, not after.
  2. Call `s.HTTP.Shutdown` with a context bounded by `s.ShutdownTimeout` (default to
     `10 * time.Second` if it's `<= 0`). `Shutdown` stops accepting new connections
     immediately and waits for in-flight requests to finish before returning — that's the
     drain.
  3. Log a `"stopped"` record with `"addr"` and a `"duration_ms"` attribute (the whole
     `Run` call's duration, from the `"starting"` log to here).
- **Never return `http.ErrServerClosed`.** `Serve` returns that error the moment
  `Shutdown` is called — it's the expected "you told me to stop" signal, not a real
  failure. Filter it out; return the real error from `Shutdown` if there was one,
  otherwise `nil`.

Run the tests locally with the command shown on the left, or click **Run go test**.
