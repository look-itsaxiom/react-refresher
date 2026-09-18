# Plan a deploy, and lock down preview URLs

`App.tsx` has two small functions with real bugs.

## 1. `planDeploy(previous, next)`

Given the previous and next build manifests (`Record<string, string>`
mapping a deployed path to a content hash), return what an atomic deploy
needs to do:

- `upload`: paths in `next` whose hash is new or changed.
- `unchanged`: paths present in both with the same hash — nothing to do.
- `delete`: paths that were in `previous` but are gone from `next`.
- `purge`: the subset of `upload` that a CDN in front of this host would
  actually need to invalidate.

That last one is the point of this exercise. A **hashed** filename
(`main-a1b2c3d4.js`) never needs a purge — a changed file gets a new URL,
so the old cached copy is simply never requested again. Only an **unhashed**
path whose content changed (an `index.html`, a hand-placed `robots.txt`)
needs an explicit purge. The current code puts every changed path into
`purge`, including hashed ones — fix it so `purge` only contains changed,
unhashed paths.

## 2. `previewPolicy(url, options)`

Given a request's `{ host, path }` and `{ productionHosts: string[] }`,
decide the policy for that host:

- A production host (`url.host` is in `options.productionHosts`): indexed
  normally, no auth required, no extra headers.
- Anything else (a deploy-preview host) is not production: it must be
  `noindex`, it must require auth, and it must carry an
  `X-Robots-Tag: noindex` header — preview URLs are the most common way a
  work-in-progress page ends up crawled or shared before it should be.

The current code gets `robots` right but always returns `requireAuth:
false` and never sets the header — exactly the "preview URL leaks" hazard
this function exists to prevent. Fix it so a non-production host requires
auth and carries the header.

Fix both functions and every check should pass.
