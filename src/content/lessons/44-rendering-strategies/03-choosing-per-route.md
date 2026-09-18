# Choosing per route, not per app

The mistake this lesson is trying to head off: picking one strategy for
"the app" instead of one per route. A single Next.js, React Router, or
Astro project routinely mixes all five — a marketing page as SSG, a search
results page as SSR, a dashboard as CSR behind auth, a product feed as ISR.
The framework choice (Next.js vs. React Router vs. Astro vs. staying an SPA)
constrains *which* strategies are available and how much ceremony each
costs; it almost never forces a single strategy across every route.

## The forcing function is personalization and auth, not content type

Content type is a reasonable first guess, but the real decision splits on
one question: **does this response differ per visitor, and does that
difference matter before first paint?**

| Route | Per-visitor content? | Strategy | Why |
|---|---|---|---|
| Marketing homepage | No | SSG (or ISR if content changes without a deploy) | Identical for every visitor; build it once, serve it from the edge forever. |
| Docs page | No | SSG | Same reasoning; content changes go through a rebuild, which is fine for docs. |
| Blog post with comments | Mostly no | SSG page + an island/client-fetched comment widget | The post is static; the comment count and form are the one part that varies and needs interactivity. |
| Search results page | Yes (query param) | SSR, cached by full URL including query string | Different per query, but still cacheable — many visitors search the same term. |
| Logged-in dashboard | Yes (per user) | CSR after an authenticated shell, or SSR with `no-store` | Content is per-user and often not cacheable at a shared layer at all; SSR here buys first-paint speed but every response is a real compute cost, no caching payoff. |
| Personalized feed (logged out default + logged in override) | Partially | Partial Prerendering / a static shell with a dynamic hole | The frame (nav, footer) is identical for everyone; the feed itself needs a per-request or per-session render. |
| Checkout | Yes, and it must be correct | SSR, no caching, or CSR against an API — never SSG/ISR | Stale pricing or inventory data is a business bug, not a UX nit; freshness is non-negotiable here regardless of the cost. |

Auth makes this sharper: a page that's identical for every anonymous
visitor but personalized once logged in (a docs site with a "your saved
pages" sidebar) is the textbook Partial Prerendering case — static shell,
one dynamic hole gated on session state.

## Edge vs. origin, and what actually varies

"Edge rendering" (Vercel Edge Functions, Cloudflare Workers, Deno Deploy)
runs your SSR/ISR logic at a CDN point of presence close to the visitor
instead of one origin region. It lowers latency for the compute itself, but
it doesn't change the rendering *strategy* — an edge-rendered SSR page is
still SSR, still priced per request, still needs the same cache-key
thinking. Where it matters:

- **TTFB for personalized-but-cacheable content** (search results, catalog
  pages with query params) — edge SSR plus a CDN cache keyed on the full
  URL gets close to SSG speed for cache hits, without giving up per-request
  freshness on a miss.
- **Cold starts and runtime limits** — edge runtimes are stricter (no
  arbitrary Node APIs, tighter memory/CPU ceilings), which pushes some
  frameworks to keep heavier SSR at the origin and only push simple,
  fast-to-render routes to the edge.
- **Nothing changes for SSG** — a build-time artifact is just a file; edge
  vs. origin is only a CDN distribution question for static output, not a
  rendering question.

## The cache key is the real design surface

Whatever you cache — a CDN response, an ISR entry, a `'use cache'`
function result — the cache key determines correctness. Cache an SSR page
by pathname alone and a `?page=2` query string collides with `?page=1`;
cache it by full URL and every marketing UTM parameter becomes a cache miss
that never gets reused. The Vary header (or its framework equivalent)
matters for the same reason: a page that differs by `Accept-Language` or a
feature-flag cookie needs that dimension in the key, or every visitor gets
whichever version happened to render first.

## RSC's role across strategies

React Server Components aren't a rendering *strategy* by themselves — they're
orthogonal, a way of deciding which parts of a tree run only on the server
regardless of when that server-side work happens. An RSC tree can be
rendered once at build time (SSG), per request (SSR), or on a revalidation
timer (ISR); the "server" in "Server Component" describes where the code
runs, not when. What RSC changes about this lesson's tradeoffs specifically:
it shrinks the client bundle (Server Components ship zero JS by default),
which is why a Next.js App Router page can afford to be "mostly SSR" without
the CSR-sized bundle cost that would have made that unattractive under the
Pages Router.

## Migrating this course's own app, one route at a time

This app is a Vite SPA: one `index.html`, client-side routing, 100% CSR.
If you were migrating it toward a framework instead of leaving it as-is,
the routes split cleanly:

- **The lesson list / track overview** — no per-user content, changes only
  on deploy. First candidate for SSG.
- **An individual lesson page** — same reasoning; the lesson content is
  identical for every learner. SSG, or ISR if content were edited without a
  full redeploy (e.g. from a CMS).
- **The sandbox/exercise runner itself** — inherently client-side: it
  compiles and runs learner code in the browser. This *has* to stay CSR;
  there's no server-side equivalent of "execute arbitrary TSX in an
  iframe."
- **Any per-user progress tracking**, if this app had accounts — CSR
  fetched against an API, or SSR with `no-store`, following the dashboard
  row in the table above.

Vite 8's Environment API is what makes this kind of gradual migration
possible without switching build tools: it lets a single Vite config
target multiple runtime environments (browser, SSR/Node, edge) so a
framework — or a hand-rolled setup — can render some routes on a server
runtime and leave others as pure client bundles, without forking the build.
It's the mechanism frameworks like Astro and, going forward, others are
building their SSR support on top of, not a rendering strategy itself.

## Measuring the decision

Core Web Vitals give you the check on whether a strategy choice actually
paid off: LCP tells you if moving a route from CSR to SSR/SSG helped first
paint; INP tells you if a heavier server-rendered page shipped enough JS to
make interactions sluggish anyway; TTFB isolates whether a slow response is
a rendering-strategy problem or a data-fetching-inside-that-strategy
problem. The performance track in this course covers measuring these in
depth — the rule of thumb for this lesson is: pick the strategy from the
table above, then measure, because a per-visitor guess ("SSR will feel
faster") is exactly the kind of claim Core Web Vitals data overturns often
enough to be worth checking.

## Further reading

- [web.dev: Rendering on the Web](https://web.dev/articles/rendering-on-the-web)
- [Next.js: Partial Prerendering](https://nextjs.org/docs/app/getting-started/partial-prerendering)
- [React Router: Pre-Rendering](https://reactrouter.com/how-to/pre-rendering)
- [web.dev: Core Web Vitals](https://web.dev/articles/vitals)
