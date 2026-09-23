# Fix the middleware chain

`middleware.go` has four bugs and one missing implementation. Fix all five so the tests pass.

- **`Chain(h, mws...)`** must apply `mws` so `mws[0]` is outermost -- the first middleware to see
  the request, the last to see the response. It currently applies them in the reverse order.
- **`RequestID`** must reuse an incoming `X-Request-ID` header if present, otherwise generate one
  (8 random bytes, hex-encoded, via `crypto/rand`). Either way it must set the header on the
  response **and** store the id in the request context, so `RequestIDFrom(ctx)` can read it back
  downstream. It currently only sets the header.
- **`Recover`** must catch a panic from `next`, respond with a 500 JSON error envelope, and let
  the server keep serving other requests afterward. It currently does nothing -- a panic
  propagates and crashes the caller.
- **`Timeout(d)`** must bound the request to `d` and respond 503 with a JSON error envelope if
  `next` doesn't finish in time. It currently does nothing -- slow handlers are never cut off.
- **`Logger(logger *slog.Logger)`** must write one `slog` record per request with fields
  `method`, `path`, `status`, `duration_ms`, and `request_id`. It currently logs nothing.

Use this error envelope shape for `Recover` and `Timeout`:

```json
{ "error": { "code": "some_code", "message": "a human-readable message" } }
```

Run `go test ./...` inside this exercise's folder to check your work.
