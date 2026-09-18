# Cache within a request, not across requests

The previous exercise handled getting data to the client safely. This one
handles a different bug: a server handling many concurrent requests on
one process, where a naive cache turns into either duplicate work
(recomputing the same fetch three times in one request) or a security
bug (leaking one user's cached data into another user's response).

There's no real `AsyncLocalStorage` available in this sandbox (it's a
Node API, and this runs in a browser-like environment), so you'll build
the same idea with an explicit context object — which is, in fact, the
simpler and more common alternative real codebases use when they don't
want ambient state at all. `App.tsx` has two pieces to implement.

## 1. `createRequestCache()`

Returns `{ run(fn) }`. Each call to `run(fn)` represents one incoming
request. Inside that call, `fn` receives a context object with a `memo`
function: `memo(key, loader)` calls `loader()` and caches the result
under `key` *for the duration of this one `run` call only*. A second
`memo` call with the same key, still inside the same `run`, returns the
already-in-flight or already-resolved promise instead of calling `loader`
again.

```ts
const cache = createRequestCache();
await cache.run(async ({ memo }) => {
  const a = memo('user:1', () => fetchUser('1')); // calls fetchUser
  const b = memo('user:1', () => fetchUser('1')); // reuses `a`, no second call
  await Promise.all([a, b]);
});
```

Two separate `run` calls — even running concurrently, even using the same
key — must never share a cache entry. Each request gets its own isolated
store.

## 2. `withCacheControl(response, options)`

Takes a `response`-like object (`{ headers: Record<string, string> }`)
and a `CacheControlOptions` (`{ public?: boolean; maxAge: number; swr?: number; vary?: string[] }`),
sets its `Cache-Control` header to something like
`public, max-age=60, stale-while-revalidate=30` (omit the
`stale-while-revalidate` part when `swr` isn't given, and use `private`
instead of `public` when `options.public` is falsy), sets `Vary` when
`vary` is non-empty, and returns the same response object.

## Why this matters

A `let` at module scope, or a cache keyed only by a fetch's URL with no
request identity in the key, is how one request's data ends up in
another user's response on a real Node server — the exact bug the first
concept step in this lesson describes. `Cache-Control`/`Vary` headers are
the other half: get `public` wrong on personalized data and a CDN will
serve one user's response to the next visitor.
