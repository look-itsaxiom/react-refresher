# Pick the right Cache-Control

`App.tsx` has two small functions with real bugs, both drawn from patterns
this course's own Vite build produces.

## 1. `cachePolicyFor(asset)`

Given an `AssetDescriptor` (`{ path, hashed, kind, personalized? }`), return
the `CachePolicy` (`{ cacheControl, vary?, notes? }`) that fits it. The
overall shape is right; fix two spots:

- **Hashed assets** (`asset.hashed === true`) should be
  `'public, max-age=31536000, immutable'` — currently missing `immutable`,
  which means the browser will still bother revalidating a file whose name
  guarantees its bytes never change.
- **Personalized API responses** (`kind: 'api'`, `personalized: true`)
  should be `'private, no-store'` — currently falling through to the same
  cacheable policy as a non-personalized API response, which lets a shared
  cache serve one user's data to the next visitor.

Everything else — the `html`, `font`, and non-personalized `api` branches —
already returns the right thing; use them as a reference for what "right"
looks like.

## 2. `bfcacheEligible(pageHeaders, usesUnload)`

Returns whether a page can enter the back/forward cache. Two rules, both
current as of 2026 Chrome:

- A page that still uses the `unload` event (instead of `pagehide`) can
  **never** enter bfcache, in any browser. `usesUnload` currently isn't
  checked at all.
- `Cache-Control: no-store` on the page's own response **no longer**
  disqualifies it in Chrome — that changed in a rollout completed in April
  2025 (the page gets a shorter cap and gets evicted on a cookie change, but
  it's still eligible). The current code still treats `no-store` as an
  automatic disqualifier, which was true before that change and is a common
  outdated assumption now.

Fix both functions and every check should pass.
