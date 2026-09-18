# Cold starts, latency, and where to put the code

## Anatomy of a cold start

A serverless cold start is: provision an execution environment, load the runtime, import
your bundle (running all module-scope code), then call the handler. Every stage adds
time, and the ones you control are bundle size and module-scope work.

- **Reduce it**: smaller bundles, lazy-load rarely-used dependencies inside the handler
  instead of at module scope, avoid heavy SDK clients that do synchronous setup on import.
- **Pay to avoid it**: Lambda **provisioned concurrency** keeps N instances permanently
  warm, at a standing cost, regardless of traffic. Lambda **SnapStart** instead snapshots
  a fully-initialized environment (originally Java/Corretto, since extended to other
  runtimes) and restores from that snapshot instead of re-running startup -- cheaper than
  provisioned concurrency because you don't pay for idle capacity, but it only helps the
  *startup* phase, not per-request work.
- **Change the concurrency model instead**: Vercel's Fluid compute keeps one warm
  instance handling many concurrent requests (closer to the "server" shape), so far
  fewer requests ever hit a cold path at all. Cloudflare Workers sidesteps the problem
  differently: isolate startup is fast enough (single-digit ms) that cold starts stop
  being the dominant cost.

Rule of thumb for choosing a mitigation: if traffic is spiky and unpredictable,
provisioned concurrency wastes money during the quiet periods; if traffic has a
predictable floor, it's often cheaper than the latency it removes.

## Edge vs. regional: the data-locality trap

Edge compute's whole pitch is "run near the user." That's true for the compute step --
but if the handler's real work is a query against a single-region Postgres instance in
`us-east-1`, putting the handler at the edge doesn't remove that round trip. It can make
it *worse*: instead of one browser-to-region hop, you now pay browser-to-nearest-edge-PoP,
then edge-PoP-to-region for the query, then back.

Worked example -- a user in Sydney, DB in `us-east-1` (Virginia):

| Placement | Hop 1 | Hop 2 | Total (rough) |
|---|---|---|---|
| Regional function, `us-east-1` | Sydney to Virginia: ~230ms RTT | (same box talks to DB locally, ~1ms) | ~230ms |
| Edge, nearest PoP to Sydney | Sydney to Sydney PoP: ~5ms RTT | Sydney PoP to Virginia DB: ~230ms RTT | ~235ms |

The edge version is *slower*, because the query still has to cross the Pacific and back
-- the isolate just adds a short local hop before doing the same long one. Edge compute
only wins when the data it needs is also close: cached, replicated, or served from an
edge-native store.

Two mitigations exist because this trap is common enough to have names:

- **Cloudflare Smart Placement** measures where a Worker's origin/DB calls actually go
  and, if they're consistently far from the edge, runs that Worker's code near the
  origin instead of near the user -- trading "near the user" for "near the data" when
  that's the faster answer.
- **Vercel regional functions** let you pin a serverless function to the region closest
  to your primary database, explicitly opting out of edge distribution for that route.

The decision isn't "edge is faster" -- it's "where is the data this route actually
needs, and does the compute placement match it."

## Durable state at the edge

Isolates don't have a filesystem and don't reliably persist module state, so "state at
the edge" is always an external, edge-native store, not a local variable:

- **Cloudflare Durable Objects**: single-threaded, addressable actors with their own
  storage -- the building block for things like a WebSocket room or a rate limiter that
  needs strict ordering.
- **Cloudflare D1**: SQLite, replicated for edge reads.
- **Cloudflare KV / R2**: eventually-consistent key-value and S3-compatible object
  storage, both edge-distributed.
- **Vercel's storage story has moved to a marketplace model** -- KV/Blob-style products
  from partners like Upstash rather than a single first-party store; check current
  Vercel docs before naming a specific product, since this has changed more than once.

## Streaming SSR at the edge

React's `renderToReadableStream` (the Web Streams counterpart to Node's
`renderToPipeableStream`, covered in the SSR lesson) is what makes streaming SSR possible
on a runtime that only speaks `Request`/`Response`/`ReadableStream` -- no Node streams
available. An edge SSR handler renders the shell, returns a `Response` whose body is
that readable stream, and the platform flushes chunks to the client as React resolves
Suspense boundaries -- the same mental model as Node SSR, ported to Web Streams.

## `waitUntil`: work after the response

Both Cloudflare Workers and Vercel Functions expose a `waitUntil(promise)` on the
execution context: it tells the platform "keep this instance alive until this promise
settles, but don't make the response wait for it." Use it for logging, analytics, or
cache writes that shouldn't add latency to the response the user is waiting on --
exactly the shape the exercise in this lesson asks you to build.

## Limits and Node compatibility

- **Execution time**: Lambda caps at 15 minutes; edge runtimes cap CPU time per request
  at low single-digit seconds (exact numbers are plan- and platform-specific -- check
  current docs rather than assuming a number holds).
- **Memory**: Lambda lets you configure it (and bills GB-seconds on it); edge isolates
  have a fixed, much smaller ceiling (tens of MB, not GB).
- **Bundle size**: edge platforms enforce a compressed script-size limit; Lambda enforces
  a deployment package limit.
- **Node compatibility**: Cloudflare's `nodejs_compat` flag fills in a growing subset of
  `node:*` built-ins (`buffer`, `events`, parts of `stream`, `crypto`, and more), but it's
  not full parity -- a dependency that reaches for `node:fs` or raw TCP sockets still
  won't work. Node itself, meanwhile, keeps closing the gap the other direction: Node LTS
  releases have supported the Web `fetch`/`Request`/`Response` globals since Node 18,
  which is *why* a portable handler can run on a plain Node server too. (Which Node major
  is current LTS in September 2026 is worth confirming against nodejs.org rather than
  assumed here.)

## Cost models

- **Server (PaaS)**: per-vCPU-hour (or a flat instance tier), running whether or not
  requests arrive.
- **Serverless function**: per-request + GB-seconds (memory x wall time). Idle costs
  nothing; a slow handler costs proportionally more.
- **Fluid/active-CPU billing**: charges for CPU time actually spent computing, not time
  spent waiting on a database or upstream `fetch` -- a meaningful difference for
  I/O-heavy handlers, which is most of them.
- **Edge**: per-request, usually with a large free/included tier, since isolates are
  cheap to spin up and hold.

## Observability

Long-running servers can hold structured loggers and APM agents in memory across
requests. Serverless and edge platforms instead expect **structured logs per invocation**
(one JSON line in, one out) shipped to a log sink, because there's no guarantee the next
request lands on the same instance to correlate with. `waitUntil`-deferred logging is the
edge/serverless idiom for "log this without blocking the response."

## A decision matrix

| Scenario | Good fit | Why |
|---|---|---|
| Marketing site, mostly static with a contact form | Static host + one serverless function for the form | No state, spiky traffic, near-zero idle cost matters more than latency |
| Dashboard reading from one regional DB | Regional serverless function (or a small server) in the DB's region | Edge adds a local hop but can't beat the DB round trip -- put compute next to data |
| Global API proxy / auth check in front of an origin | Edge (Workers/Deno Deploy) | Low-latency, stateless, CPU-light per request; isolate cold starts are irrelevant |
| Webhook receiver that must ack fast, then do work | Function or edge handler that acks immediately and uses `waitUntil` for the real work | Caller times out fast; deferred work shouldn't hold the response open |
| Long video transcode / batch job | Long-running server or a queue-backed worker, not a function | Exceeds serverless execution-time limits; needs sustained CPU, not per-request billing |

## Further reading

- [AWS Lambda: cold starts and provisioned concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html)
- [Cloudflare: Smart Placement](https://developers.cloudflare.com/workers/configuration/smart-placement/)
- [Cloudflare: Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Vercel: Fluid compute](https://vercel.com/docs/fluid-compute)
- [React: `renderToReadableStream`](https://react.dev/reference/react-dom/server/renderToReadableStream)
