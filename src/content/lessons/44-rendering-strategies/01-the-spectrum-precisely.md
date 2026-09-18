# The spectrum, precisely

You already know CSR and SSR as words. What matters now is the axis they sit
on, because every other term in this lesson — SSG, ISR, streaming, islands,
partial prerendering — is a point on that same axis, not a separate idea.
The axis is: **when does the server do work, and how long does the result
stay valid before it has to be redone?** Everything else — TTFB, LCP, INP,
caching, cost — falls out of where you sit on it.

## CSR: no server work, client does everything

The server (or CDN) returns a near-empty HTML shell and a JS bundle. The
browser downloads the bundle, executes it, fetches data, and renders. This
is where this course's own app lives: Vite builds a single `index.html`
with a `<div id="root">` and a script tag, nothing else.

- **TTFB**: excellent — the shell is static, served instantly from a CDN.
- **LCP**: bad relative to the others — the browser must download JS,
  parse it, execute it, then fetch data, then paint. Every one of those is
  serial unless you've built out route-based code splitting and parallel
  fetching yourself.
- **INP**: fine once hydrated, no different from any client app.
- **Caching**: trivial — the shell is one static file, cacheable forever.
- **Freshness**: whatever the client fetches, whenever it fetches it —
  entirely decoupled from deploys.
- **Cost**: cheapest to run (no server compute per request), most
  expensive in user-perceived latency.
- **Complexity**: lowest. No server rendering pipeline to build or debug.

## SSG: all the server work, done once, at build time

The full HTML for a page is generated when you build the site, then served
as a static file forever after — identical to CSR's caching story, but the
HTML already has content instead of an empty shell.

- **TTFB/LCP**: best possible. There's no per-request work at all; a CDN
  edge node returns bytes it already had.
- **Freshness**: frozen at build time. A content change means a rebuild
  and redeploy. This is the entire tradeoff of SSG in one sentence.
- **Cost**: cheapest to run, same as CSR, but you pay in build time and in
  build fanout — a site with 500,000 product pages means 500,000 files to
  generate on every build unless the framework supports incremental builds.
- **Complexity**: low for content that doesn't depend on the requester.
  Breaks down fast for anything personalized, or with enough pages that a
  full rebuild becomes slow.

## SSR: server work, every request

The server renders full HTML per request, typically after fetching
whatever data that request needs, and returns it already populated. The
client still hydrates afterward (more on that in the next lesson), but the
first paint doesn't wait for JS to run.

- **TTFB**: worse than SSG/CSR — the server has to actually do the render
  before responding, and if it fetches data first, that fetch is on the
  critical path.
- **LCP**: usually the best of the "has real content" options, because the
  browser paints from HTML it already received, no client fetch required.
- **Freshness**: perfect — always current as of the request.
- **Cost**: highest. Every single request costs server compute, which is
  why SSR pages get cached at the CDN when they can be.
- **Complexity**: highest of the static/dynamic pair — you now maintain a
  server runtime, not just a build pipeline.

## ISR: SSR's freshness cost, amortized

Incremental Static Regeneration serves a cached (stale-but-valid) HTML
response immediately, and separately, in the background, regenerates that
page — either on a timer (`revalidate: 60` means "this page is good for 60
seconds") or on demand (a webhook says "this content changed, blow away the
cache for this path"). The next request after regeneration finishes gets
the fresh copy. This is the same *stale-while-revalidate* pattern browsers
and CDNs already use for HTTP caching, just applied to whole rendered
pages.

- **TTFB/LCP**: as good as SSG for almost every request — you're serving a
  cached file. Only the request that triggers (and doesn't wait for)
  regeneration pays SSR-like cost, and even that's avoidable with
  on-demand revalidation triggered by a webhook instead of a request.
- **Freshness**: bounded staleness instead of perfect or frozen — you
  choose the bound.
- **Cost**: close to SSG's, with occasional SSR-priced regenerations.
- **Complexity**: the added axis is cache invalidation — arguably the
  hardest problem in this entire lesson, general enough that this is where
  "there are two hard problems in computer science" jokes come from. Who
  triggers regeneration, how do you dedupe two requests that both notice
  the cache is stale at the same instant, what happens on regeneration
  failure — none of that is optional to think through.

## Streaming SSR: unblock the parts that are slow

Ordinary SSR waits for the *whole* tree to render before sending anything.
Streaming SSR (React's `renderToReadableStream`, wrapping slow subtrees in
`<Suspense>`) sends the shell and the fast parts immediately, then streams
each slow chunk in as its data resolves — out of order, arriving whenever
it's ready, spliced into the right place in the DOM via inline scripts the
runtime writes alongside each chunk.

- **TTFB**: as fast as the *fastest* part of the page, not the slowest —
  this is the whole point.
- **LCP**: improves for the parts that were already fast; the slow parts
  still show a fallback until their chunk arrives, same as they would with
  client fetching, just server-orchestrated instead.
- **Freshness**: same as SSR — this is an SSR technique, not a caching
  strategy.
- **Complexity**: real, but mostly moved from "how do I make the whole page
  fast" to "where do I put Suspense boundaries" — a design decision, not a
  new subsystem.

## Islands and partial hydration: most of the page is dead weight

Astro's islands architecture inverts the default: the page is
server-rendered HTML by default, and only explicitly marked interactive
components ("islands") ship JS and hydrate at all. A blog post with one
comment widget ships one component's worth of JS, not the whole page's.
This is a different axis from CSR/SSR/SSG — it's about *how much of the
page needs to become interactive*, not about when the HTML was generated.
Astro's islands are typically SSG or SSR'd (server islands defer a specific
island's render to request time, independent of the rest of the page).

## Partial Prerendering: a static shell with dynamic holes, one response

Next.js's Cache Components model (the production form of what shipped
experimentally as PPR) composes a route from a static shell — cached and
served instantly — with dynamic segments left as holes that render per
request and stream in, all within a single HTTP response. You mark what's
cacheable with `'use cache'`; everything else is dynamic by default. It's
streaming SSR and ISR's caching story fused into one per-route mechanism,
so a marketing page's static header and footer never re-render while its
personalized "recommended for you" strip does.

## Further reading

- [Next.js: Partial Prerendering](https://nextjs.org/docs/app/getting-started/partial-prerendering)
- [Next.js: `cacheComponents` config](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)
- [react.dev: `renderToReadableStream`](https://react.dev/reference/react-dom/server/renderToReadableStream)
- [Astro: Server islands](https://docs.astro.build/en/guides/server-islands/)
