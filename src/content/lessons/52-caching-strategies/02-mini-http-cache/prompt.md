# Fix the mini HTTP cache

`App.tsx` implements `createHttpCache(clock)`, a simplified **shared** cache
(think: one CDN edge node) that sits in front of an `origin` function. It
already handles the overall shape correctly — parsing `Cache-Control`,
looking up entries, deciding whether to talk to the origin — but four bugs
are hiding in it. Each one is a real caching mistake.

Call shape:

```ts
const cache = createHttpCache(clock); // clock: () => number, milliseconds
const { response, cacheStatus } = cache.fetch(
  { url: '/orders', headers: { 'Accept-Encoding': 'gzip' } },
  (request) => ({ status: 200, headers: { 'Cache-Control': 'public, max-age=60' }, body: '...' }),
);
```

`cacheStatus` is one of `'HIT'` (served from cache, no origin contact),
`'MISS'` (no usable entry, full origin fetch), `'STALE'` (served the old
cached body immediately, while a revalidation happened), or `'REVALIDATED'`
(blocked on a conditional request that came back `304`).

## The four bugs

1. **`lookup` ignores `Vary` entirely.** It always returns whatever variant
   was cached first for a URL, regardless of whether this request's
   `Vary`-listed headers match. Fix it so a response's `Vary: Accept-Encoding`
   (for example) keeps the `gzip` and `br` variants of the same URL from
   colliding.
2. **`save` never checks for `no-store`.** A response carrying
   `Cache-Control: no-store` must never be written to the cache — every
   request for it should reach the origin.
3. **Freshness only looks at `max-age`, never `s-maxage`.** This cache models
   a *shared* cache, and RFC 9111 says a shared cache must prefer `s-maxage`
   over `max-age` when both are present.
4. **`stale-while-revalidate` is hardcoded to `false`.** An entry that's
   stale but still inside its `max-age + stale-while-revalidate` window
   should be served immediately (`'STALE'`) instead of blocking on the
   origin like a fully expired entry would.

Everything else — `no-cache` forcing a revalidation every time, `immutable`
skipping revalidation entirely, `stale-if-error` falling back to the stale
body on a `5xx`, and a blocking `304` resetting freshness — already works;
use those to see the shape a correct fix should take.

Fix all four and every check should pass.
