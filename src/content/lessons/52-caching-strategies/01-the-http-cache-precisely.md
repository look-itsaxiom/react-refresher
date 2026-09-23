# The HTTP cache, precisely

You've already seen two narrow slices of caching in this course: lesson 44's
ISR model (regenerate a static page on a timer or on demand) and lesson 46's
request-scoped memoization plus a `withCacheControl` helper. This lesson is
the rest of the picture — the actual HTTP-level cache that sits between
every request and every response, and the layers built on top of it.

## Two questions, not one

Every cached response answers two independent questions:

1. **Is it still fresh?** (Can a cache use it without asking anyone?)
2. **If not, is it still valid?** (Can a cache confirm it's unchanged
   without re-downloading it?)

`Cache-Control` governs freshness. `ETag`/`Last-Modified` govern validation.
Most real bugs come from conflating the two.

## The directives people get wrong

```
Cache-Control: public, max-age=300, stale-while-revalidate=60
```

- **`max-age=<seconds>`** — freshness lifetime from the moment the response
  was generated (not from when it was cached, if those differ — `Age`
  accounts for the gap on a CDN-fronted response).
- **`s-maxage=<seconds>`** — the freshness lifetime a *shared* cache (CDN,
  corporate proxy) should use instead of `max-age`. A browser ignores it;
  it's how you tell a CDN "cache this for an hour" while telling the
  visitor's own browser "but only trust your local copy for a minute."
- **`no-cache`** — despite the name, this **does not mean "don't cache."**
  It means "cache it, but revalidate with the origin on every use before
  serving it." That's a conditional request (often resulting in a fast
  `304`), not a full re-download.
- **`no-store`** — this is the one that actually means "don't cache."
  Nothing is written to any cache at all, ever. `no-cache` and `no-store`
  are the single most common mix-up in this entire header.
- **`private`** vs **`public`** — `private` permits only a single-user cache
  (the browser); `public` additionally permits shared caches (CDNs,
  proxies) to store the response for reuse across different users. Getting
  `public` on personalized data wrong is a real data-leak class, not a
  theoretical one — a response with someone's account balance and
  `Cache-Control: public, max-age=300` lets a CDN serve that balance to the
  next visitor who hits the same URL within five minutes.
- **`must-revalidate`** — once stale, this response must be revalidated
  before use, full stop — no serving a stale copy under network failure
  (which is otherwise permitted by some clients via `max-stale`).
- **`immutable`** — a stronger promise than a long `max-age`: the response
  body will never change for the life of that URL, so a cache can skip
  conditional requests entirely, even on a user-triggered reload. This only
  makes sense paired with a URL that changes when the content does — which
  is exactly what a content hash gives you.
- **`stale-while-revalidate=<seconds>`** and **`stale-if-error=<seconds>`**
  (both normalized into RFC 9111, originally RFC 5861) extend usability past
  the freshness lifetime: the first serves the stale copy immediately while
  revalidating in the background; the second serves the stale copy when a
  revalidation attempt gets a `5xx` instead of failing the request outright.

If a response has **no** `Cache-Control` and no `Expires` at all, caches are
still allowed to guess a freshness lifetime — **heuristic caching**, RFC
9111 §4.2.2, commonly ~10% of the time since `Last-Modified`. Don't rely on
this. An unspecified header means an unspecified — and inconsistent —
result across browsers and CDNs; always send an explicit `Cache-Control`.

## The immutable-hash + short-lived-HTML pattern

This course's own build (`vite build`) produces exactly the pattern worth
memorizing:

- `assets/main.a1b2c3d4.js`, `assets/index.9f8e7d.css` — content-hashed
  filenames. Ship these as `public, max-age=31536000, immutable`. The hash
  *is* the cache key; a new deploy is a new URL, so there is nothing to
  invalidate and nothing to revalidate.
- `index.html` — unhashed, references the hashed bundles by name. Ship this
  as `no-cache` (or a very short `max-age` plus `stale-while-revalidate`).
  It has to be re-checked on every visit, or your users never see a new
  deploy until something else forces a reload.

## Conditional requests, precisely

A cache that can't serve a response as fresh isn't stuck re-downloading it
— it can ask the origin to confirm nothing changed:

- **`ETag` / `If-None-Match`** — the origin sends an opaque validator
  (`ETag: "a1b2c3"`); the cache echoes it back on the next request
  (`If-None-Match: "a1b2c3"`). A match gets a `304 Not Modified` with no
  body — freshness resets, nothing is re-sent.
- **`Last-Modified` / `If-Modified-Since`** — a coarser, timestamp-based
  version of the same idea, second-resolution and comparison-based rather
  than exact-match. Prefer `ETag` when you can compute one cheaply; it
  catches changes `Last-Modified` can miss (a file rewritten with identical
  bytes and a new mtime, or two changes inside one second).
- A `304` still costs a round trip — it's cheap, not free. `immutable` and
  long `max-age` exist specifically to avoid needing one at all.

## `Vary`, and how it kills caching by accident

`Vary: Accept-Encoding` tells every downstream cache "this response's body
depends on the request's `Accept-Encoding` — key your cache entries by that
header too, not just the URL." Without it, a cache that stored the
`br`-compressed variant might hand it to a client that only accepts `gzip`.

The failure mode: **`Vary: *`** means "this response is uncacheable by
anything downstream," because *no* cache key can be guaranteed to match
twice. Some frameworks emit this accidentally (often via a middleware that
sets `Vary` from a header set built at request time without ever narrowing
it down) and silently lose all caching for a route. Similarly, `Vary:
Cookie` is technically correct for session-dependent responses but
partitions your cache key by every distinct cookie value — on a route where
the cookie is a unique session ID, that's the same as no caching at all;
the fix is almost always to stop varying by the whole cookie and instead
vary by (or move the personalization out to) something coarser.

## Two caches, not one: HTTP cache vs. bfcache

The browser's ordinary HTTP disk/memory cache is not the same thing as the
**back/forward cache** (bfcache) that restores a whole page — DOM, JS
heap, scroll position — instantly on a back/forward navigation, without a
network request or any script re-running from scratch. They're governed by
different rules entirely:

- The HTTP cache is partitioned by the **top-level site** in modern
  browsers (Chrome and Safari both ship this) — a script loaded from a
  shared CDN on `a.com` and again on `b.com` no longer reuses one cache
  entry across those two sites, closing a cross-site tracking side channel
  that unpartitioned shared caching used to open.
- bfcache eligibility has its own disqualifiers, independent of
  `Cache-Control`. The durable one: a page that adds an `unload` event
  listener can never use bfcache, in any browser — use `pagehide` (or the
  Page Lifecycle API's `visibilitychange`) instead, always. A newer one,
  specific to Chrome and easy to get wrong from outdated advice: Chrome's
  rollout completed in April 2025 means `Cache-Control: no-store` **no
  longer blocks bfcache** by itself — that page can still be restored
  instantly, just with a shorter cap (3 minutes instead of 10) and eviction
  on any cookie change. Open `WebSocket`/`WebTransport`/`WebRTC` connections
  still block it either way.

## Debugging reflex

Before trusting a mental model of what should be cached, look: DevTools'
Network panel Size column distinguishes `(disk cache)`, `(memory cache)`,
and a real transfer; a response's `Age` header tells you how long a shared
cache has already held it; and a CDN-specific header (`x-cache`, `cf-cache-status`,
depending on vendor) tells you HIT vs. MISS at that layer specifically —
useful because "cached" is never a single yes/no across browser, CDN, and
origin at once.

## Further reading (optional)
- [MDN: `Cache-Control`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
- [MDN: `Vary`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Vary)
- [Chrome for Developers: Enabling bfcache for `Cache-Control: no-store`](https://developer.chrome.com/docs/web-platform/bfcache-ccns)
