# Streaming, caching, and platform limits

The first concept step covered getting the right data to the right
place. This one covers what happens once that data takes longer than the
user should wait for, how the result gets reused instead of recomputed,
and where the server code is actually allowed to run.

## Streaming with Suspense

`renderToString` (what you used in the last lesson's exercises) blocks
until the entire tree is ready — one slow `await` anywhere in the tree
delays every byte. Production SSR uses a streaming renderer instead:
`renderToPipeableStream` on a Node server, `renderToReadableStream` on
Web-standard runtimes (edge functions, Deno, Bun). Both take the same
approach: render everything that's ready immediately, send it as the
**shell**, and stream in the rest as it resolves.

```tsx
function OrderPage() {
  return (
    <Layout>
      <OrderSummary />               {/* fast, in the shell */}
      <Suspense fallback={<Spinner />}>
        <RecommendedItems />          {/* slow, streamed in later */}
      </Suspense>
    </Layout>
  );
}
```

`renderToPipeableStream` takes an `onShellReady` callback — that's your
signal to start piping to the response, because everything *not* wrapped
in a `Suspense` boundary is done. A component that suspends without a
boundary above it blocks the shell exactly like `renderToString` would;
the boundary is what turns "slow thing" into "thing that streams in
later" instead of "thing that delays everything." When `RecommendedItems`
resolves, React sends a script chunk that swaps the fallback for the real
content — **out of order** relative to the document, which is why this
only works over a real streaming connection, not a buffered response.

On the client, `<Suspense>` composes the same way with `use()` for a
promise passed down as a prop, or with data-router primitives — React
Router's `<Await>` component (and TanStack Router's deferred loader data)
let you render the shell immediately and resolve a slow piece inside its
own boundary, mirroring the server-side pattern for client-side
navigations that don't do a full SSR pass.

## Errors after the shell has shipped

The chunk that has the biggest consequence: **the HTTP status code is
already sent** by the time a deep Suspense boundary errors. If
`RecommendedItems` throws after `onShellReady` already flushed a 200, you
cannot retroactively make it a 500 — the client already has headers. The
error has to be handled *inside* the stream: an error boundary around the
suspended section renders a fallback UI in place, and you log the failure
server-side separately (it never reaches the browser's network tab as a
failed request — the request succeeded; a *component* inside it failed).
This is why `onShellError` and `onError` are separate callbacks in
`renderToPipeableStream`: `onShellError` fires for a failure before the
shell is ready (you can still choose a real error status), `onError` fires
for anything after (all you can do is log it and let the boundary's
fallback do its job).

## Caching, layered

Real SSR performance comes from not redoing work, at several layers that
compose:

1. **Per-request memoization.** `cache()` inside a single render pass, or
   the request-scoped cache shim you'll build in this lesson's second
   exercise — dedupes an identical fetch called from two different
   components during the *same* request. Gone by the next request.
2. **Cross-request server cache.** Next.js 16's Cache Components model
   (the `"use cache"` directive, with `cacheLife()`/`cacheTag()` to set
   TTLs and invalidation tags) memoizes a function's result across many
   requests, on the server, until it's revalidated or its tag is busted.
   This is the successor to the older implicit `fetch` caching — treat
   the exact API as moving fast in 2026 and check the changelog before
   shipping against it.
3. **CDN / HTTP cache.** A response header, not a framework feature:
   `Cache-Control: public, max-age=60, stale-while-revalidate=30` tells
   any CDN or browser cache to serve a response for 60 seconds, then keep
   serving the stale copy for up to 30 more seconds *while* it
   revalidates in the background — the request that triggers the
   revalidation still gets the fast stale response. `Vary` tells the
   cache which request headers split the cache into separate entries
   (`Vary: Cookie` for anything session-dependent — and `private` instead
   of `public` for anything that must never sit in a shared cache at all).

The layers solve different problems: per-request memo stops duplicate
work *within* one render; `"use cache"` stops recomputation *across*
requests on your server; CDN headers stop the request from reaching your
server at all. Get the header wrong on a personalized page (`public` on
something with a user's balance in it) and you've cached one person's
data for the next visitor.

## Edge vs. Node runtimes

Deploying "at the edge" (Vercel Edge Functions, Cloudflare Workers,
Deno Deploy) trades the full Node.js API for Web-standard APIs
(`fetch`, `Request`, `Response`, `ReadableStream`, `crypto.subtle`) and
gets lower cold-start latency plus execution near the user's region in
return. The trade has real teeth: no `fs`, no most native Node modules,
and many database drivers that use raw TCP sockets don't work there
either (this is why "edge-compatible" database clients — HTTP-based
Postgres drivers, for instance — exist as a category). A loader that
reads a file or opens a raw socket has to run on a Node runtime, full
stop; check your framework's per-route `runtime` config
(`export const runtime = 'edge'` in Next.js) before assuming a loader
is portable.

## Observability

Once data loading is spread across loaders, RSC, and multiple cache
layers, "why was this slow" needs infrastructure, not guessing:
`Server-Timing` response headers surface named durations
(`Server-Timing: db;dur=120, cache;dur=4`) directly in the browser's
Network tab, and a tracing setup (OpenTelemetry is the common choice for
both Next.js and standalone Node servers) lets you follow one request
across loader → cache lookup → downstream service. Add timing headers
before you need them — retrofitting observability during an incident is
the expensive way to learn this lesson.

**Further reading:**
- [React: `renderToPipeableStream`](https://react.dev/reference/react-dom/server/renderToPipeableStream)
- [React: `renderToReadableStream`](https://react.dev/reference/react-dom/server/renderToReadableStream)
- [MDN: `Cache-Control`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- [MDN: `Server-Timing`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing)
