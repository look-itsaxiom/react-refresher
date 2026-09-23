# Layers: CDN, edge, app, service worker

A response you think of as "cached" is usually cached in several different
places at once, each with its own knobs, its own invalidation story, and
its own failure mode when you forget it exists.

## The CDN layer

A CDN is a shared cache running at edge locations close to your users, and
it mostly speaks the same `Cache-Control` vocabulary from the last concept
step — with one addition. **`s-maxage`** is the standard way to give a
shared cache a different (usually longer) freshness lifetime than the
browser gets. Several CDN vendors also support a **`CDN-Cache-Control`**
header (or a vendor-specific equivalent) that lets you target *just* the
CDN layer without affecting `s-maxage`'s effect on other shared caches
sitting in between — useful once you have more than one shared cache in
the path (a corporate proxy in front of a CDN, for instance).

**Cache keys** are the part people forget. A CDN doesn't cache by URL path
alone by default — many normalize query strings, some don't; most exclude
`Cookie` from the key unless you tell them to `Vary` by it (and, per the
last concept step, varying by a whole session cookie destroys your hit
rate). Two requests that a human would call "the same page" can be two
different cache keys — `?utm_source=x` appended by an ad campaign, or a
trailing slash — and silently double your origin traffic if the CDN's
default normalization doesn't collapse them.

**Purging** is the other half. You don't wait out a `max-age` when content
changes right now — you purge. The common models:

- **Purge by URL** — exact-match invalidation, simplest, doesn't scale to
  "every page that mentions this product."
  - **Purge by tag** (Fastly's `Surrogate-Key`, Cloudflare's `Cache-Tag`) —
  tag a response when you cache it, then purge every cached response
  carrying that tag in one call. This is how a CMS invalidates "every page
  that embeds article 4821" without knowing which pages those are ahead of
  time.
- **Origin shielding** — routing all edge-cache-miss traffic through one
  designated shielding location before it reaches your origin, so a
  simultaneous miss at fifty edge nodes turns into one origin request
  instead of fifty. Worth enabling on anything with real traffic; it's a
  checkbox, not an architecture change.

`stale-while-revalidate` and `stale-if-error` matter *most* at this layer,
because a CDN edge is exactly where "serve the slightly-stale response
instantly instead of making the user wait on a slow origin" pays off, and
where "the origin had a bad minute" is a routine event you don't want to
turn into a user-visible outage.

## The application layer

Application-level caches solve a different problem than HTTP caching: not
"should this response cross the network again," but "should this
already-in-memory value be recomputed." They compose with, rather than
replace, everything above:

- **React Query's `staleTime`** decides how long client-held data is
  treated as fresh enough to skip a refetch on mount/focus — the client-side
  analog of `max-age`, but for JS-held state, not an HTTP response.
  `gcTime` (formerly `cacheTime`) decides how long an unused query stays in
  memory at all before eviction.
- **`"use cache"`** (Next.js 16's Cache Components model, covered in lesson
  46) memoizes a server function's result across requests, with
  `cacheLife()`/`cacheTag()` controlling TTL and tag-based invalidation —
  the server-side equivalent of what a CDN purge-by-tag does, one layer
  further in.
- **Plain memoization** (`useMemo`, a module-level `Map`, `React.cache()`
  for one request) is the narrowest layer: it only ever saves a
  recomputation, never a network round trip.

None of these read `Cache-Control`, and none of them are a substitute for
it — a `staleTime` of five minutes on the client does nothing if a CDN in
front of your API is serving a different, staler copy to different users,
and vice versa. Get the layer that's actually causing a "why is this
stale" bug wrong and you'll spend an afternoon tuning the wrong knob.

## The service worker layer — a preview

A service worker can intercept every `fetch` from a page it controls and
answer it from a **programmable** cache (the `Cache` API — `caches.open()`,
`cache.match()`, `cache.put()`) instead of the browser's ordinary HTTP
cache. This is qualitatively different from everything above: it's not a
header telling an existing cache what to do, it's your own code deciding,
per request, whether to serve from cache, go to the network, or race both
(cache-first, network-first, stale-while-revalidate-as-code rather than as
a header). Lesson 85 (in the PWA track) covers the actual strategies —
`workbox`'s named strategies, precaching a build's manifest, versioning a
cache name per deploy so an old service worker doesn't serve assets that no
longer exist. The one thing worth knowing now: a service worker cache
entry persists across sessions independent of `Cache-Control` entirely,
which is exactly why versioning the cache *name* (not relying on any
header) is how that layer handles deploys.

## Invalidation strategies, compared

Three ways a deploy actually reaches a returning user, in order of how
much they rely on cache headers being right:

1. **Content hashing** (what Vite does by default) — the URL changes when
   the content changes, so there is no invalidation step; the old URL's
   long-lived cache entry is simply never requested again. The strongest
   option, because it doesn't depend on any cache correctly expiring or
   being told to purge.
2. **Versioned URLs** (`/v3/app.js`, a query string bump) — same idea,
   applied manually instead of via a build-time hash. Works, but only as
   well as your discipline about bumping the version everywhere it's
   referenced.
3. **Purge on deploy** — necessary for anything that *can't* be
   content-addressed (`index.html` itself, a CMS page, an API response),
   which is why it's a `no-cache`/short-`max-age` + purge-on-write combo
   rather than a single mechanism.

## Clear-Site-Data, on logout

None of the above is scoped to "this specific user's session ending."
`Clear-Site-Data: "cache", "cookies", "storage"` (or `"*"` for everything)
is a response header a logout endpoint can send to tell the browser to
wipe locally-stored state for that origin — cache entries, cookies,
`localStorage`, IndexedDB — right then, rather than waiting for a
`max-age` no `no-store` header would have prevented from being written in
the first place. It's the cleanup step for the shared-device case a
`private`/`no-store` header alone doesn't cover: the data was legitimately
cached for this user, and now this user is done.

## Interview angle

Caching shows up explicitly in the posting's backend concerns list, and the strongest answer
treats it as several layers, not one knob. Walk through them by name: CDN caching with
`s-maxage` and tag-based purging, and application-layer caching like React Query's `staleTime`
for client-held data — and be ready to explain why none of these read each other's state, a
short client `staleTime` does nothing if a CDN in front of your Go API is serving a different,
staler copy to a different vendor's session. Given that this program's data is shared across a
customer, vendors, and partners, purge-by-tag matters more than it would on a single-tenant app:
when one company updates a shared resource, every cached view referencing it across every other
participant's session needs to be invalidated together, exactly the "every page that embeds
article 4821" problem this lesson names. Also worth mentioning: cache keys that don't account for
per-organization scoping are a real bug — two different companies' views of "the same" project
page are not actually the same response.

**Likely follow-up:** A vendor updates a shared document and three other companies on the program
are viewing cached versions of a page that references it. How do you get everyone a fresh copy
without just disabling caching?

**Pitfall:** Reaching for `Vary: Cookie` or session-scoped caching as a default fix for
multi-tenant data. It technically works but destroys your CDN hit rate — the better move is
scoping cache keys and tags by the actual resource and organization boundary, not by the whole
session.

## Further reading (optional)
- [web.dev: HTTP caching](https://web.dev/articles/http-cache)
- [MDN: Using the Cache API (service workers)](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [MDN: `Clear-Site-Data`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Clear-Site-Data)
- [Fastly: Cache invalidation with Surrogate-Key](https://www.fastly.com/documentation/guides/concepts/edge-state/cache/surrogate-keys/)
