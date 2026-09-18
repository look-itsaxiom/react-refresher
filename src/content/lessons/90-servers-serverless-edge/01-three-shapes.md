# Three shapes of a backend for a frontend

Every place you can run server-side code for a React app collapses into three shapes.
The differences aren't cosmetic -- they change how you write handlers, how you hold
state, what you're billed for, and what breaks under load.

## Long-running server

A Node (or Bun) process that stays alive: `http.createServer`, Express, Fastify, Hono.
You deploy it to a VM or a PaaS -- Railway, Render, Fly.io, or a box running Coolify --
and it keeps running between requests.

- **Startup**: once, at deploy time. No cold start per request.
- **Concurrency**: however many requests your event loop and connection pool can serve
  at once. In-memory caches, WebSocket connections, and long-lived DB pools all work
  because the process persists.
- **State**: module-scope variables live for the life of the process, shared across every
  request it handles concurrently -- which is a footgun (see the SSR lesson's caution
  about module-scope state) as much as a feature.
- **Limits**: bounded by the box, not by a platform-imposed timeout. Fine for
  long-running jobs, WebSockets, or anything that streams for minutes.
- **Pricing**: per-vCPU-hour, whether or not a request arrives. Railway and Render bill
  for the instance's uptime; free tiers often sleep on idle and pay a cold start to
  wake back up, which is exactly the tradeoff serverless is supposed to avoid.
- **Operational contract**: you own health checks, graceful shutdown, and `SIGTERM`
  handling. When Railway or Render redeploys or scales down an instance, it sends
  `SIGTERM` and expects the process to stop accepting new connections, finish in-flight
  requests, and exit -- within a grace window (typically single-digit seconds to ~30s,
  platform-dependent). Skip that and in-flight requests get dropped mid-response.

## Serverless functions

AWS Lambda, Vercel Functions (Node runtime), Netlify Functions. Your code is a handler,
not a process. The platform starts an instance to run it, and may stop that instance
when demand drops.

- **Startup**: a "cold start" spins up a fresh instance -- import your code, run any
  module-scope setup, then call the handler. A container-based cold start (Lambda Node
  runtime) typically runs somewhere from tens of milliseconds to low seconds depending on
  bundle size and runtime; a "warm" instance skips straight to the handler.
- **Concurrency**: classic Lambda gives each concurrent request its own instance --
  one request per instance at a time. Newer models (Vercel's Fluid compute) let one
  warm instance serve many concurrent requests, closing part of the gap with a
  long-running server.
- **State**: module-scope variables persist only for the life of one instance, and only
  between requests that instance happens to serve -- there's no guarantee two requests
  land on the same instance. Treat anything you need across requests as external
  (a database, KV store, or cache), not as a local variable.
- **Limits**: a maximum execution time (Lambda: 15 minutes max, often configured much
  lower), a memory ceiling you also pay for, and a deployment package size cap.
  Provisioned concurrency (Lambda) or `SnapStart` (Lambda, Java/Corretto and now other
  runtimes) can pre-warm or snapshot instances to cut cold starts, at extra cost.
- **Pricing**: per-request plus GB-seconds (memory allocated x execution time) -- you
  pay for exactly the compute a request uses, nothing while idle. Fluid compute-style
  "active CPU time" billing narrows this further by not charging for time a function
  spends waiting on I/O.

## Edge runtimes

Cloudflare Workers, Deno Deploy, Fastly Compute, and (with caveats below) Vercel Edge
Functions. Code runs in a V8 isolate -- not a container, not a full OS process -- often
replicated to dozens or hundreds of points of presence near users.

- **Startup**: isolates start in single-digit milliseconds because there's no container
  or OS to boot, just a new V8 context in an already-running process. This is the headline
  reason edge exists: it makes "cold start" nearly a non-issue.
- **Concurrency**: many isolates share one process; the platform multiplexes requests
  across them cheaply.
- **State**: isolates are even more ephemeral than serverless instances -- no filesystem,
  and module-scope state is not something to rely on across requests. Durable state is a
  separate product: Cloudflare Durable Objects (single-threaded, stateful actors), D1
  (SQLite at the edge), KV, and R2 (object storage). Vercel's own KV/Blob offerings have
  shifted to a marketplace of partners (e.g. Upstash) rather than first-party products --
  worth confirming against current docs before relying on either name.
- **Limits**: no Node.js APIs by default -- only Web-standard globals (`fetch`, `Request`,
  `Response`, `Headers`, `URL`, `crypto`, streams). Cloudflare's `nodejs_compat` flag
  fills in a growing subset of `node:*` modules, but it's a subset, not parity. CPU time
  per request is capped (low milliseconds to a couple seconds depending on plan), and
  wall-clock time waiting on I/O usually isn't counted against that cap.
- **Pricing**: per-request, often with a generous included tier, since isolates are cheap
  to keep around.

Vercel's own positioning has moved: after leaning into an Edge runtime for its speed,
Vercel's 2025 push toward "Fluid compute" steers more workloads back to a Node.js
runtime with better concurrency and Node API access, keeping Edge for the narrower cases
that specifically need isolate startup times. Treat "Edge Functions" and "Fluid compute"
as distinct products with different tradeoffs, not synonyms -- confirm current defaults
against Vercel's docs before committing a design to one.

## The portable handler: WinterTC and `fetch`

Every one of Workers, Deno Deploy, Vercel Functions, and (via an adapter) Lambda can run
a handler shaped like:

```ts
type Handler = (request: Request, env: unknown, ctx: unknown) => Promise<Response>;
```

That's not an accident. WinterCG -- the community group that became Ecma TC55
("WinterTC") in 2025 -- exists specifically to standardize a *minimum common web platform
API* across server-side JS runtimes: `Request`, `Response`, `Headers`, `URL`, streams,
`crypto.subtle`, and friends, defined by reference to the same WHATWG/W3C specs browsers
implement. The goal is that code written against `fetch`'s types runs unmodified on
Workers, Deno, Bun, Node (which added a `fetch`-compatible `Request`/`Response` in v18+),
and Vercel/Netlify functions.

This is why modern frameworks converge on a `fetch` handler as their portable core:

- **Hono** is built entirely around `(c) => c.json(...)`-style handlers over `Request`
  and exports adapters for every runtime above -- it's less a framework than a portable
  routing layer over the WinterTC surface.
- **Next.js** Route Handlers accept `(request: Request) => Response`, and the framework's
  adapters translate that to whichever platform builds the app.
- **React Router 8 / TanStack Start** ship the same idea under different names: a
  request handler your framework's dev server, Node adapter, or edge adapter all call
  the same way.
- **Nitro** (the engine under Nuxt, and usable standalone) and **h3** (its HTTP layer)
  are explicitly built to target "any JS runtime" through this same `Request`/`Response`
  contract, with presets per target (Node, Vercel, Cloudflare, Deno Deploy...).

Practically: if you write your route logic against `Request` in, `Response` out, you can
choose *later* where it runs. If you reach for `req.socket`, raw Node streams, or
platform-specific globals, you've picked a runtime, whether or not you meant to.

## Further reading

- [WinterTC / Minimum Common API](https://min-common-api.proposal.wintercg.org/)
- [Cloudflare Workers: how Workers works](https://developers.cloudflare.com/workers/reference/how-workers-works/)
- [Vercel: Functions](https://vercel.com/docs/functions)
- [AWS Lambda execution environment](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html)
- [Hono](https://hono.dev/)
