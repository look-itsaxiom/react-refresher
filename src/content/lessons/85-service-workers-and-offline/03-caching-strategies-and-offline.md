# Caching strategies and offline

[[Caching strategies]] (lesson 52) covered HTTP caching — headers,
`max-age`, `stale-while-revalidate` as a *directive* the browser and CDNs
interpret for you. A service worker's `fetch` handler is a different layer
entirely: you write the caching policy yourself, in JavaScript, per
request. Nothing happens unless your code calls `event.respondWith(...)`.

## The five strategies

Each is a small function shape: given a `Request` and a cache, decide what
to return and whether to update the cache.

**Cache-first** (a.k.a. cache-falling-back-to-network). Check the cache;
if there's a hit, return it and skip the network entirely. Otherwise fetch,
store a clone, return the response. Right for content addressed by a hash —
it never changes at that URL, so there's nothing to revalidate:

```ts
async function cacheFirst(request: Request, { cache }: { cache: Cache }) {
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}
```

**Network-first.** Try the network; fall back to cache on failure or
timeout. Right for HTML documents and anything where "possibly stale" is
worse than "possibly slow" — you want the freshest version whenever the
network is there, and *something* when it isn't.

**Stale-while-revalidate.** Return the cached response immediately if one
exists (never block the user on the network), and kick off a network fetch
in the background to refresh the cache for next time. Right for API GETs
and other data where a slightly-stale read is fine but you still want it to
converge quickly — this is the same idea [[Caching strategies]] introduced
as an HTTP header, reimplemented as code you control precisely.

**Network-only.** Never touch the cache — the default for anything you
never want served stale: payment endpoints, anything mutating.

**Cache-only.** Never touch the network — for a fully precached asset you
know is already in the cache by the time this route is hit (rare outside
precaching internals).

## Picking a strategy per route

A real app mixes all of these, routed by request type:

| Route | Strategy | Why |
|---|---|---|
| `/index.html`, navigations | network-first | must reflect the latest deploy; falls back offline |
| `main.[hash].js`, `styles.[hash].css` | cache-first | hash guarantees the content behind a URL never changes |
| `/api/*` GET | stale-while-revalidate + expiration | fast repeat views, self-healing staleness |
| images | cache-first + max entries | rarely change, but unbounded growth needs a cap |
| `/api/*` POST/PUT/DELETE | network-only (+ Background Sync when offline) | never serve a mutation from cache |

Workbox names these `CacheFirst`, `NetworkFirst`, `StaleWhileRevalidate`,
`NetworkOnly`, `CacheOnly` in `workbox-strategies`, and `workbox-routing`'s
`registerRoute(matcher, strategy)` is exactly this per-route table, encoded.
`workbox-expiration`'s `ExpirationPlugin({ maxEntries, maxAgeSeconds })`
bolts eviction onto any strategy.

## Offline fallback, quota, and expiration

A `NetworkFirst` route for navigations still needs a floor: if the network
fails *and* nothing matching is cached, precache one `offline.html` and
`catch` down to it. That's the entire "offline page" pattern — no magic,
just a strategy with a final fallback.

Storage isn't unlimited. `navigator.storage.estimate()` returns
`{ usage, quota }` so you can reason about headroom; when a device is under
pressure, browsers evict *origins* under quota pressure using
least-recently-used heuristics, which can silently empty your caches.
`navigator.storage.persist()` requests exemption from that eviction (the
browser may prompt, or grant/deny based on engagement heuristics — it's not
guaranteed). This is why bounded caches (`ExpirationPlugin`, or your own
LRU-by-`keys()` sweep) matter even for "small" apps: you're a good citizen
of shared, finite disk.

## Background Sync, navigation preload, streaming

**Background Sync** (`workbox-background-sync`, Chromium-only — no Safari,
no Firefox as of 2026) queues failed `fetch`es (typically POSTs) in
IndexedDB and replays them once connectivity returns, via a
`sync` event the browser fires outside the page's lifetime. **Periodic
Background Sync** is the same idea on a schedule instead of a connectivity
event, gated behind an install/engagement heuristic and even narrower
support. Both need a network-only fallback path for browsers that lack
them — never make a feature depend on Background Sync existing.

**Navigation preload** (`registration.navigationPreload.enable()`) starts
the network request for a navigation *in parallel* with the `fetch` event
handler waking up, instead of after — it removes the SW's own cold-start
latency from the critical path when your strategy ultimately needs the
network anyway.

**Streaming**: `event.respondWith` accepts a `Response` built from a
`ReadableStream`, so a SW can start returning bytes before a slow upstream
finishes — useful for compositing a cached shell with a streamed body, less
useful for typical CRUD APIs.

## Debugging checklist

- DevTools → Application → Service Workers: check "Update on reload" while
  developing (bypasses the wait-for-tabs-to-close dance) and "Bypass for
  network" to temporarily disable interception without unregistering.
- `chrome://serviceworker-internals` (Chrome/Chromium) lists every
  registration on the device, including ones DevTools for the current tab
  won't show.
- If a fetch "isn't being intercepted," check scope first, then check
  whether the worker is still `installing`/`waiting` rather than active.
- Application → Cache Storage shows every named `Cache`, entry by entry —
  the fastest way to confirm a `put()` actually happened.

## Safari and "should I ship a SW at all"

Safari supports the core Service Worker + Cache Storage API but not
Background Sync, Periodic Background Sync, or (historically) navigation
preload — build the offline/caching win on strategies alone and treat sync
as a Chromium-only enhancement. Safari also aggressively caps and evicts
service worker storage for sites without recent user interaction (part of
its anti-tracking storage model), so "offline works forever" is a stronger
claim on Chromium than on Safari.

Skip a service worker entirely for: internal admin tools nobody needs
offline, apps already behind aggressive server-side caching where a SW adds
complexity without a user-visible win, and anything where "wrong answer
served from a stale cache" is worse than "no answer while offline" — a
health record or trading UI should probably fail loud rather than serve
last week's cached numbers.

## Further reading (optional)

- [web.dev: The service worker's fetch event and offline strategies](https://web.dev/learn/pwa/offline-data)
- [developer.chrome.com: Workbox strategies](https://developer.chrome.com/docs/workbox/modules/workbox-strategies)
- [developer.chrome.com: Workbox background sync](https://developer.chrome.com/docs/workbox/modules/workbox-background-sync)
- [MDN: StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)
- [caniuse: Background Sync (no Safari, no Firefox as of 2026)](https://caniuse.com/mdn-api_serviceworkerregistration_sync)
