# Off the main thread, and across contexts

React's concurrent features (transitions, `useDeferredValue`) help the main thread stay responsive
by chopping *your own render work* into interruptible pieces. They do nothing for a synchronous,
CPU-heavy function — parsing a huge JSON blob, hashing, image processing, running a diff over a
large dataset — that blocks the thread for hundreds of milliseconds straight. For that, the tool is
a Web Worker: a genuinely separate thread with no access to the DOM, communicating with the page
only by passing messages.

## Workers: what they are and aren't

```ts
// main.ts
const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
worker.postMessage({ kind: 'hash', payload: bigArray });
worker.onmessage = (event) => console.log(event.data);

// worker.ts — runs on its own thread
self.onmessage = (event) => {
  const result = expensiveHash(event.data.payload);
  self.postMessage(result);
};
```

`{ type: 'module' }` gets you a **module worker** — `import`/`export` inside the worker file,
instead of the older classic-worker script model. That's the version worth defaulting to now.

A worker has no `window`, no DOM, no access to variables in your component's closure. Everything
that crosses the `postMessage` boundary — in either direction — goes through **structured clone**,
not a shared reference. That means:

- Objects, arrays, `Map`/`Set`, `Date`, typed arrays, and `ArrayBuffer` clone fine.
- Functions, DOM nodes, and most class instances with non-serializable internals (an open
  `WebSocket`, an `Error` subclass with extra un-cloneable fields) do **not** clone — you'll get a
  `DataCloneError` at the `postMessage` call, not a silent failure later.
- Cloning a large `ArrayBuffer` copies every byte. If you don't need the main thread to keep its
  own copy, pass it as a **transferable** instead: `worker.postMessage(buffer, [buffer])` moves
  ownership to the worker with no copy, and the sending side's `buffer` becomes unusable
  (`byteLength` reads `0`) immediately after. This is the difference between "clone the whole
  100MB image buffer" and "hand it over."

For a shared mutable buffer visible on both sides simultaneously — the actual concurrent-memory
case — `SharedArrayBuffer` plus `Atomics` is the tool, but it comes with a real cost: browsers
require the page to be served with `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` (COOP/COEP) before `SharedArrayBuffer` is available at
all, a response to the Spectre-class speculative-execution attacks that made shared memory
dangerous without process isolation. If you don't control those response headers, you don't get
`SharedArrayBuffer`, full stop — structured clone (or transfer) is the fallback.

## A protocol on top of `postMessage`

Raw `postMessage`/`onmessage` gives you fire-and-forget, unordered messages — no built-in way to
say "this response answers that specific request." Any real usage builds a thin RPC layer on top:
tag each outgoing message with an id, keep a map of pending promises keyed by that id, resolve (or
reject) the right one when a response with a matching id comes back. This is exactly what the
[Comlink](https://github.com/GoogleChromeLabs/comlink) library automates — it proxies method calls
across `postMessage` so a worker "feels" like an async object — but the underlying pattern (id
correlation over an unordered channel) is worth building by hand at least once, because it's the
same pattern behind `MessageChannel`, `BroadcastChannel` RPC, and even WebSocket request/response
layers.

## `MessageChannel` and `BroadcastChannel`

`MessageChannel` creates a private pair of connected ports (`port1`, `port2`) — hand one end to a
worker, an iframe, or another tab, and the two sides can talk directly without routing every
message through whoever set up the channel. It's the mechanism worker libraries like Comlink use
internally, and it's also how you'd give an iframe a dedicated, isolated line back to the parent
page instead of the broadcast-to-everyone `window.postMessage`.

`BroadcastChannel` is the cross-tab sibling: every same-origin tab, window, or worker that opens
`new BroadcastChannel('name')` receives every message posted to that channel by any of the others.
It's the simplest fix for "user logs out in one tab, every other open tab should know" or "a
purchase completes in one tab, reflect it everywhere" — no server round-trip, no polling
`localStorage` for changes.

```ts
const channel = new BroadcastChannel('auth');
channel.postMessage({ type: 'logout' });
// in every other tab:
channel.onmessage = (event) => { if (event.data.type === 'logout') redirectToLogin(); };
```

## When a worker actually pays off

Moving work to a worker costs a message round trip (structured clone, at minimum) and real
implementation complexity (the protocol above). It's worth it when the work is genuinely CPU-bound
and blocks the main thread long enough for a user to feel it — parsing a multi-megabyte JSON or CSV
payload, client-side image resizing/filtering, cryptographic hashing, running a diff or search over
a large in-memory dataset. It's not worth it for anything already async by nature (a `fetch` call
doesn't block the main thread regardless of where you await it) or for work so small the message
overhead exceeds the savings.

## Realtime, briefly: WebSocket vs. SSE vs. WebTransport

Three ways a server can push data without the client re-requesting: **Server-Sent Events**
(`EventSource`, or a hand-rolled stream like the NDJSON exercise here) are simplex — server to
client only, over plain HTTP, with automatic reconnection built in, best when the client never
needs to send anything back on the same connection. **WebSocket** is full-duplex over its own
protocol — the right choice when the client sends frequent messages too (chat, collaborative
editing, gameplay). **WebTransport**, built on HTTP/3's QUIC, is the newest option: multiple
independent streams (so one lost packet doesn't head-of-line-block the others, unlike WebSocket
over TCP) plus unreliable datagrams when occasional loss is fine — suited to things like
low-latency game state sync, at the cost of being the least universally supported of the three.

## Further reading (optional)

- [MDN: Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [MDN: Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [MDN: `BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel)
- [web.dev: `SharedArrayBuffer` and COOP/COEP](https://web.dev/articles/why-coop-coep)
