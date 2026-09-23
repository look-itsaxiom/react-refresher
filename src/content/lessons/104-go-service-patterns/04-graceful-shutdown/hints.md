Start `s.HTTP.Serve(ln)` in its own goroutine, sending its returned error into a
buffered `chan error` of size 1, so the goroutine can finish without anyone reading from
it yet. Then `select` between that channel and `ctx.Done()` — `ctx.Done()` is the normal
path; the channel firing first means the server stopped on its own, before shutdown was
ever requested.

---

Once `ctx.Done()` wins the `select`, that's your signal to begin shutdown: flip
readiness first, *then* build a fresh `context.WithTimeout(context.Background(), timeout)`
for `Shutdown` — don't reuse the (already-cancelled) `ctx` you were blocking on, or
`Shutdown` will see an already-done context and return immediately without draining
anything.

---

After calling `s.HTTP.Shutdown(shutdownCtx)`, receive from the `chan error` you set up
for `Serve` before doing anything else — `Serve` always returns once `Shutdown` unblocks
it, and reading that value is what keeps the `go s.HTTP.Serve(ln)` goroutine from being
the one thing still running after `Run` returns.

---

Track `start := time.Now()` right when `Run` begins, and compute
`time.Since(start).Milliseconds()` for the `"stopped"` log's `duration_ms` — that's the
whole lifetime of the call, not just the shutdown phase.

---

Filter `http.ErrServerClosed` with `errors.Is(err, http.ErrServerClosed)` in both places
an error could surface: the early-return branch (if `Serve` failed on its own) and after
`Shutdown` (where `Serve`'s buffered error is exactly this sentinel on the normal path).
