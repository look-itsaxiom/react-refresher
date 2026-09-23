# Fetch, properly

You've written `fetch(url).then(r => r.json())` a thousand times. This step is everything around
that call you've probably been skipping: the `Request`/`Response` objects underneath it, treating
a body as a stream instead of a blob, and the controls (`AbortController`, `priority`,
`keepalive`) that separate "it works in the demo" from "it survives production."

## `Request` and `Response` are objects, not strings

`fetch(url, init)` is sugar for constructing a `Request` and getting back a `Response`. Both are
first-class objects you can build, clone, and pass around:

```ts
const req = new Request('/api/orders', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: 42 }),
});
const res = await fetch(req);
res.ok;          // true for 2xx
res.status;      // 201
res.headers.get('content-type');
```

`Response` also has static helpers worth knowing: `Response.json(data, init)` builds a JSON
response without you hand-rolling headers — useful in a Service Worker or a mock, less often in
app code calling `fetch` itself. `Response.error()` and `Response.redirect()` exist for the same
reason: constructing test doubles and Service Worker responses without going through the network.

The part people forget: `res.body` is a `ReadableStream<Uint8Array>`. `res.json()`, `res.text()`,
and `res.blob()` are just convenience methods that fully drain that stream and buffer the result.
If you want the data as it arrives instead of after the whole response lands, you read `res.body`
directly.

## Streaming a response body

This is how LLM chat UIs render tokens as they generate, and how any "typing indicator" style feed
works: the server sends the response as a stream of chunks — often newline-delimited JSON
(NDJSON), or Server-Sent-Events-style `data: {...}\n\n` frames — and the client reads and parses
each chunk as it arrives instead of waiting for the connection to close.

```ts
const res = await fetch('/api/stream');
const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
let buffer = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += value;
  // split buffer on your framing (newlines, "\n\n", etc.) and handle complete pieces
}
```

`TextDecoderStream` matters more than it looks: bytes arrive in arbitrary chunks, and a multi-byte
UTF-8 character can straddle a chunk boundary. A raw `TextDecoder` handed one chunk at a time would
mangle it; `TextDecoderStream` (and `TextDecoder.decode(chunk, { stream: true })` if you're doing
it manually) buffers the trailing partial byte sequence until the next chunk completes it. The
same boundary problem exists one level up, in your *framing* — a chunk can split a line in the
middle — which is why any hand-rolled line reader needs its own leftover buffer, independent of
the decoder's.

`TransformStream` lets you build this as a pipeline instead of a manual loop: a line-splitter is a
`TransformStream` whose `transform(chunk, controller)` buffers and calls `controller.enqueue(line)`
for each complete line found, and whose `flush` handles a trailing partial. Piped together —
`res.body.pipeThrough(new TextDecoderStream()).pipeThrough(lineSplitter)` — you get an async
iterable of lines instead of raw bytes, and the platform enforces **backpressure** automatically:
if your consumer reads slowly, the `pull` side of the pipeline stalls upstream reads too, instead
of buffering the whole response in memory. You don't get backpressure for free with a manual
`while (true) { await reader.read() }` loop unless you actually wait on the promise before reading
again — which the loop above already does, correctly, one read at a time.

## Cancellation: `AbortController` and friends

Every `fetch` should be cancellable, and as of a few years ago the platform makes this easy enough
that there's no excuse not to:

```ts
const controller = new AbortController();
fetch(url, { signal: controller.signal });
controller.abort();               // cancels the fetch; it rejects with a DOMException named 'AbortError'
```

Two combinators remove most of the boilerplate you'd otherwise write by hand:

- **`AbortSignal.timeout(ms)`** returns a signal that fires on its own after `ms` milliseconds —
  no `setTimeout` + manual `abort()` + cleanup required for a request timeout.
- **`AbortSignal.any([signalA, signalB])`** returns a signal that fires as soon as *any* of its
  inputs fire — combine a user-driven cancel button, a route-change abort, and a timeout into one
  signal without writing the fan-in yourself: `fetch(url, { signal: AbortSignal.any([userSignal, AbortSignal.timeout(5000)]) })`.

Streaming reads should respect the same signal: pass it to `fetch`, and also check
`signal.aborted` inside your read loop so you stop pulling chunks (and can cancel the reader)
the moment it fires, rather than only preventing a *future* request.

## The requests that outlive their page

Two options exist specifically for "fire this and don't wait for the tab": `keepalive: true` on
`fetch` tells the browser to keep the request alive briefly even if the document unloads — useful
for a final analytics beacon on page exit, though it comes with a small total body-size limit
across all keepalive requests. `navigator.sendBeacon(url, data)` predates it and is simpler for
that one case (fire-and-forget, no response handling, no need to juggle `visibilitychange`/
`pagehide` timing) but can't set custom headers or read a response. For anything you need to
retry, cancel, or inspect the result of, use `fetch` with `keepalive`; for pure exit-telemetry,
`sendBeacon` is still the more reliable default that browsers optimize for.

`fetch`'s `priority` option (`'high' | 'low' | 'auto'`) is a hint to the browser's resource
scheduler, similar to `<img fetchpriority>` — use `'high'` for something blocking a critical
render, `'low'` for prefetching something the user probably wants next. It doesn't change what the
server does; it only changes how the browser schedules the request among everything else it's
fetching.

## Credentials and CORS, briefly

`fetch`'s `credentials` option controls whether cookies ride along: `'same-origin'` (the default)
sends them only to your own origin, `'include'` sends them cross-origin too (and requires the
server to echo back a specific `Access-Control-Allow-Origin`, not `*`, plus
`Access-Control-Allow-Credentials: true`), `'omit'` never sends them. Any cross-origin request
that isn't a "simple request" (custom headers, methods beyond GET/HEAD/POST, certain content
types) triggers a preflight `OPTIONS` first — the browser asking permission before the real
request goes out. That's the mechanic; a later track goes deeper into what a secure CORS
configuration actually looks like.

## Further reading (optional)

- [MDN: Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN: Streams API concepts](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts)
- [MDN: `AbortSignal.timeout()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static)
- [MDN: `AbortSignal.any()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/any_static)
