`Chain` is a loop with the iteration direction flipped. Applying `mws[0]` *last* is what makes it
outermost -- each `mws[i](h)` wraps whatever `h` currently is, so the last one applied ends up on
the outside.

---

`RequestID`: after computing `id`, use `context.WithValue(r.Context(), requestIDKey, id)` to get a
new context, then pass it downstream with `r.WithContext(ctx)` -- `next.ServeHTTP(w, r.WithContext(ctx))`,
not `next.ServeHTTP(w, r)`. `RequestIDFrom` just needs to read that same key back out with a type
assertion.

---

`Recover`: wrap `next.ServeHTTP(w, r)` in a function with a `defer` that calls `recover()`. If
`recover()` returns non-nil, a panic happened -- write the 500 envelope there. `defer` runs even
when the enclosing function is unwinding from a panic, which is exactly what makes `recover` work.

---

`Timeout`: `http.TimeoutHandler(next, d, msg)` does the hard part (running `next` on a separate
goroutine against a buffer, so nothing races on the real `ResponseWriter`) and returns 503 with
`msg` as the body on timeout. One catch: on the timeout path, it writes straight to the outer
`ResponseWriter` without calling back into `next`, so if you want `Content-Type: application/json`
on that response, set the header on `w` *before* delegating to the `TimeoutHandler`-wrapped
handler, not inside `next`.

---

`Logger`: wrap `w` in a small type that embeds `http.ResponseWriter` and overrides `WriteHeader`
to record the status code before delegating to the embedded writer's `WriteHeader`. Call
`next.ServeHTTP` with the wrapper, then log after it returns -- `time.Since(start)` for the
duration, and `RequestIDFrom(r.Context())` for the id (which is why `RequestID` has to run
before `Logger` in whatever chain a test builds).

---

Near-solution shape for the status-capturing writer and `Logger`:

```go
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (rec *statusRecorder) WriteHeader(code int) {
	rec.status = code
	rec.ResponseWriter.WriteHeader(code)
}

func Logger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			logger.Info("request",
				"method", r.Method, "path", r.URL.Path,
				"status", rec.status, "duration_ms", time.Since(start).Milliseconds(),
				"request_id", RequestIDFrom(r.Context()))
		})
	}
}
```
