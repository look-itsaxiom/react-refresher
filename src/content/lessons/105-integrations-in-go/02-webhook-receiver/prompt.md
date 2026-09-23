# Fix the webhook receiver

`webhook.go` in this step's folder has a `Verify` function and an `http.Handler` with three
real bugs, marked with `TODO` comments. Fix them so `go test ./...` passes.

Run it yourself from `exercises-local/105-integrations-in-go/02-webhook-receiver/`:

```bash
go test ./...
```

## What's broken

1. **`Verify` only checks the first secret.** During a signing-secret rotation, the
   provider may still be signing with the *old* secret while you've already added the
   *new* one. `Verify` needs to accept a signature that matches **any** secret in the list,
   compared with `hmac.Equal` (never `==` -- that's a timing side channel on authentication
   material).
2. **`Verify` ignores the tolerance window entirely.** A validly-signed request from ten
   minutes ago (or a captured, replayed one) should be rejected as stale if it falls
   outside `tolerance` of `now`.
3. **`Handler` marks an event processed *before* calling `process`, and never checks
   whether it's already been processed.** That means: (a) every redelivery of an event
   re-runs `process`, even ones you already handled successfully, and (b) if `process`
   fails, the event is nonetheless stuck marked "processed" forever, so a legitimate retry
   silently does nothing.

## What the handler must do, precisely

Given `secrets [][]byte`, a `Store`, a `now func() time.Time`, and a `process func(Event)
error`:

- Read the body once, capped at 1 MiB (`http.MaxBytesReader`).
- Read `X-Timestamp` (Unix seconds) and `X-Signature` (hex HMAC) headers and call `Verify`
  with a 5-minute tolerance.
  - Bad signature → `401`.
  - Stale timestamp, malformed timestamp, or malformed JSON body → `400`.
- Decode the body into an `Event`. If `store.Processed(evt.ID)` is already true, respond
  `200` with `{"status":"duplicate"}` **without calling `process`**.
- Otherwise call `process(evt)`.
  - If it returns an error → `500`, and the event must **not** end up marked processed (so
    a retry of the same event runs `process` again).
  - If it succeeds → call `store.MarkProcessed(evt.ID)`, then respond `202` with
    `{"status":"accepted"}`.

`Sign`, `Event`, `Store`, and `MemStore` are already correct -- you're only fixing `Verify`
and `Handler`.
