Look at `crypto/hmac`'s `Equal` function. It takes two `[]byte`, not two strings -- decode
the hex signature with `hex.DecodeString` before comparing, and decode your own computed
signature (from `Sign`, which returns a hex string) the same way.

---

For the secret rotation, loop over `secrets` and try each one; `Verify` should succeed if
**any** of them produces a matching HMAC. Check the tolerance window only after you've
confirmed the signature matches *some* secret -- checking staleness first leaks information
to an attacker who hasn't proven they know a valid secret yet.

---

For staleness: compute `now.Sub(ts)`, take its absolute value (a timestamp can be stale in
either direction -- too old, or implausibly in the future), and compare against `tolerance`.

---

For the handler's ordering bug: call `store.Processed(evt.ID)` **before** calling
`process`, and return early with the duplicate response if it's `true`. Call
`store.MarkProcessed(evt.ID)` **after** `process` returns successfully -- not before, and
not if `process` returned an error.

---

Full shape of the fixed handler, in order: read + limit body → parse timestamp → `Verify` →
decode `Event` → check `store.Processed` (return `200` duplicate if true) → call `process`
(return `500` if it errors) → `store.MarkProcessed` → return `202`.
