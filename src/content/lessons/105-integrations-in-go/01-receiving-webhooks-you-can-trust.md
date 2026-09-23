# Receiving: webhooks you can trust

A webhook is just an HTTP request someone else's server sends to yours, unprompted, when
something happened on their side: a payment cleared, a candidate moved stages, a partner
updated a shared record. From the receiver's chair -- which is where you'll sit in this
lesson -- a webhook endpoint is a `net/http` handler like any other from lesson 103, with
one twist: the caller is not a browser you control, it's a third party's infrastructure,
and it will retry, duplicate, reorder, and occasionally attack you. Everything below is
about surviving that.

## Verifying the signature

Providers sign webhook payloads so you can prove the request actually came from them and
wasn't forged or tampered with in transit. Stripe and GitHub both use the same shape:
HMAC-SHA256 over a string built from a timestamp and the raw body, sent as a header
alongside the payload. Stripe's `Stripe-Signature` header carries `t=<timestamp>,v1=<hex
hmac>`; GitHub's `X-Hub-Signature-256` carries `sha256=<hex hmac>` with the timestamp
handled separately by the delivery's own freshness. The exercise in this lesson uses a
simplified version of the same idea: sign `"<unix-timestamp>.<body>"` with a shared
secret.

```go
func Sign(secret []byte, ts time.Time, body []byte) string {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(strconv.FormatInt(ts.Unix(), 10)))
	mac.Write([]byte("."))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}
```

To verify, you recompute the same HMAC over the same bytes with your copy of the secret
and compare. The comparison is the part people get wrong: `want == got` on two strings (or
two byte slices) short-circuits on the first differing byte, which leaks *how much* of the
signature you got right through response timing. It's a slow, noisy side channel, but it's
real, and the fix costs nothing: `hmac.Equal` from `crypto/hmac` runs in constant time.
Never compare authentication material with `==`.

```go
if !hmac.Equal(wantBytes, gotBytes) {
	return ErrBadSignature
}
```

## Replay protection

A valid signature only proves the request was signed with your secret at some point -- not
that it's fresh. Anyone who captures a signed request off the wire (a compromised proxy, a
logged header, a browser extension) can replay it verbatim, forever, and your HMAC check
will pass every time. That's why the signed string includes a timestamp: you check it
against a tolerance window, typically five minutes, and reject anything outside it as
stale. Five minutes covers real clock skew and network delay without leaving much room for
a captured request to still be useful. Stripe and GitHub both document tolerance windows
in this range for exactly this reason.

Order matters here: verify the signature first, *then* check staleness. If you check
staleness first, an attacker can probe your tolerance window with garbage signatures and
learn something about your clock; if you check the signature first, a stale-but-otherwise-
valid request tells you nothing useful before you've confirmed it's actually from the
provider.

## Read the raw body once

The signature is computed over the exact bytes the provider sent -- not over your
re-serialized `json.Marshal` of what you think the body means. Decode too early (letting
`json.NewDecoder` consume the request body as it parses) and you've lost the raw bytes you
need to verify against. The right order is: read the whole body into memory first with
`io.ReadAll`, verify the signature against those exact bytes, *then* unmarshal.

Reading the whole body also means bounding it. A handler that calls `io.ReadAll(r.Body)`
with no limit will happily buffer gigabytes into memory if a caller (malicious or just
misbehaving) sends a huge payload. Wrap the body in `http.MaxBytesReader(w, r.Body, limit)`
before reading; it works like an `io.Reader` up to the limit and then returns an error,
which surfaces as a request that fails to read rather than a memory spike. A `MaxBytesReader`
also closes the connection on overflow (in HTTP/1.1) so a client can't keep streaming
past the limit hoping you'll relent.

## Respond fast, process later

A provider's webhook delivery has its own timeout, usually a handful of seconds. If your
handler does the real work synchronously -- calling other services, writing to several
tables, sending notifications -- and any of that is slow, the provider's request times out,
it marks the delivery failed, and it retries. Now you're doing the slow work twice, or
three times, while the provider's dashboard shows your integration as unreliable.

The fix is the same shape as lesson 104's worker pool: the handler's only job is to verify,
deduplicate, and enqueue -- then respond `2xx` immediately. A worker goroutine (or a
separate process reading the same queue) does the actual processing on its own schedule,
with its own retry and backoff logic, decoupled from the provider's timeout. The exercise
in this lesson calls `process` synchronously inside the handler to keep the grading
self-contained, but the prose is the real lesson: in production, `process` enqueues, it
doesn't execute.

## At-least-once delivery means idempotent handlers

Providers guarantee *at-least-once* delivery, not exactly-once. If your `2xx` response gets
lost on the way back to them, or their own infrastructure times out waiting for it, they
will redeliver the same event, with the same event ID, later. Your handler has to treat
that as normal, not exceptional. Two ways to make it idempotent:

- **A processed-events store.** Keep a record of event IDs you've already handled and skip
  reprocessing (and skip re-triggering any side effect) for a duplicate. An in-memory map
  works for a single process and for tests; a real service needs it to survive restarts,
  so it becomes a table with a TTL (event IDs older than your replay tolerance can be
  purged) and, critically, a **unique constraint** on the event ID column. The constraint,
  not your application logic, is what actually prevents a race between two concurrent
  deliveries of the same event from both slipping through a "check, then insert" gap.
  Lesson 106 covers that constraint and the constraint-vs-application-logic tradeoff in
  detail.
- **Idempotency keys for your own outbound calls.** When your handler's processing
  involves calling *another* service (charging a card, sending a payment), that call needs
  its own idempotency story, independent of the provider's event ID -- see the client-side
  half of this lesson, next.

The subtlety worth internalizing: marking an event "processed" and doing the processing
are two different moments, and the order between them determines whether a failure is
recoverable. Mark first, process second, and a crash between the two silently drops a
webhook forever -- the store thinks it's done, but nothing happened. Process first, mark
second, and a crash between the two means a harmless redelivery re-runs `process` -- which
is fine, because that's exactly the case idempotency is protecting.

## Ordering isn't guaranteed, and dead letters happen

Webhooks can arrive out of order: a "refunded" event can reach your endpoint before the
"charged" event it refers to, especially across retries. If your processing logic assumes
strict ordering ("a refund always follows a charge"), build in a way to handle the
out-of-order case -- look up the related record by ID rather than assuming it was already
created, or make the operation itself commutative.

And some events will fail processing no matter how many times they're retried: a
downstream service is permanently down, the payload references a record that was deleted,
a bug throws on this one shape of input. Cap your retry count (the provider does this too;
Stripe stops retrying after roughly three days) and route anything that exhausts retries to
a dead-letter queue -- a place to land and get paged on, not silently drop.

## Secret rotation

Rotating a webhook signing secret is routine security hygiene, and it's routine to get
wrong: rotate the secret on your side and the provider's side atomically, and every
in-flight request signed with the old secret in the gap between the two starts failing
verification. The fix costs one line: accept a *list* of secrets during a rotation window,
try each one, and only reject if none match. Once you've confirmed the provider has fully
switched to the new secret, drop the old one from the list.

```go
func Verify(secrets [][]byte, ts time.Time, body []byte, sig string, now time.Time, tolerance time.Duration) error {
	for _, secret := range secrets {
		if hmac.Equal(sign(secret, ts, body), sigBytes) {
			return checkTolerance(ts, now, tolerance)
		}
	}
	return ErrBadSignature
}
```

This is the same "accept old and new during a transition" pattern you'd use rotating a JWT
signing key or a CSRF token secret -- see lesson 66 for the CSRF side of that story, and
lesson 68 for why the secret needs to be a build-time or runtime input, never a value
committed to source.

## Testing with httptest and a fixture signature

None of this needs a real webhook provider to test. Build a request with `httptest`, sign
it yourself with the same `Sign` function your handler verifies against, and set the
headers your handler reads. That's the whole fixture:

```go
body := []byte(`{"id":"evt_1","type":"payment.succeeded"}`)
ts := time.Unix(1_700_000_000, 0)
req := httptest.NewRequest(http.MethodPost, "/webhooks", bytes.NewReader(body))
req.Header.Set("X-Timestamp", strconv.FormatInt(ts.Unix(), 10))
req.Header.Set("X-Signature", Sign(secret, ts, body))
```

Because `now` is injected as a function rather than called directly, tests control it
completely -- no `time.Sleep`, no flakiness, staleness and freshness are both exact and
instant to assert on.

## Further reading (optional)

- Stripe, ["Verify webhook signatures"](https://docs.stripe.com/webhooks#verify-manually) --
  the `t=...,v1=...` header shape and the 5-minute default tolerance.
- GitHub, ["Validating webhook deliveries"](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) --
  `X-Hub-Signature-256` and `hmac.Equal`-equivalent constant-time comparison.
- Go standard library, [`crypto/hmac`](https://pkg.go.dev/crypto/hmac) -- `hmac.Equal` and
  why `New(sha256.New, key)` is the standard construction.
- Go standard library, [`net/http#MaxBytesReader`](https://pkg.go.dev/net/http#MaxBytesReader) --
  bounding request body reads.
