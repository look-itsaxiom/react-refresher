## Caching, redirects, and fallbacks done right

Lesson 52 covered `Cache-Control` semantics in general. On a static host,
those semantics collapse into a simple two-tier policy, and the rest of
this concept is the redirect and fallback machinery that sits around it.

### The two-tier cache policy

Every modern build tool (Vite included) content-hashes its output:
`main-a1b2c3d4.js`, `logo-9f8e7d2c.png`. A hashed filename can never point
at different bytes without also changing — so it earns the strongest cache
directive available:

```
Cache-Control: public, max-age=31536000, immutable
```

`index.html` (and any other unhashed HTML entry point) is the opposite
case: it's the thing that has to change on every deploy, because it's what
references the new hashed filenames. It gets revalidated on every load —
either a short `max-age` or `max-age=0` paired with `must-revalidate`, so
a stale copy is never served without checking first:

```
Cache-Control: public, max-age=0, must-revalidate
```

Caching the entry point the same way you cache its immutable children is a
real, common mistake: it means returning visitors keep loading last week's
HTML — and therefore last week's asset references — until something else
forces a reload.

### Atomic deploys make purge mostly unnecessary

A CDN purge exists to solve one problem: "the cached copy is wrong, and I
need it gone before its `max-age` expires." Hashed assets never have this
problem — a changed file gets a new URL, so the old cached copy is simply
never requested again; nothing to purge. Because a static host's deploy is
atomic and its HTML is already revalidated on every request, most static
sites never need to purge anything at all. The remaining case is a
non-hashed path whose content changed and which is *also* cached longer
than "always revalidate" — a non-hashed API response fronted by the same
CDN, for instance. That's the one category where you still reach for an
explicit invalidation call.

### Rewrites vs. redirects, and which status code

A **rewrite** serves different content at the same URL — the browser's
address bar never changes. All four platforms in concept 1 support this as
a `200` "redirect" rule (Netlify/Cloudflare literally write `200` in the
status field to mean "rewrite, don't redirect"). A **redirect** sends the
browser to a new URL:

- **301** (permanent) and **302** (temporary) are the classic pair, but
  historically some clients silently turned a 302 `POST` into a `GET` on
  the follow-up request — a real interoperability wrinkle.
- **307** and **308** are the modern, unambiguous versions: they guarantee
  the method and body are preserved. **308** is the permanent one you want
  when consolidating URLs (e.g., enforcing `www` or a trailing-slash
  policy) and correctness of the original method matters.

Redirect rules commonly need a wildcard. A splat captures the rest of the
path (`/blog/*` → `/posts/:splat`, so `/blog/2024/post` becomes
`/posts/2024/post`); a named placeholder captures one segment
(`/users/:id` → `/api/users/:id`). A **forced** redirect rule overrides an
existing file at that path — the ordinary rule is "a real file always wins
over a redirect," and `force` is the explicit escape hatch for the rare
case where you want the redirect to win anyway (retiring a page that still
has a static file sitting at its old URL, say).

### The SPA fallback and its trade-off

A client-rendered SPA has exactly one HTML file, but the router needs
`/settings`, `/users/42`, and every other in-app path to resolve to
*something* on a hard refresh or a shared link. The fallback options
differ in a way that matters for SEO and monitoring:

- **GitHub Pages' `404.html` hack**: copy `index.html` to `404.html`. The
  server still returns a real **404 status code** — search engines and
  uptime monitors see "not found" even though the page renders fine for a
  human. That status-code mismatch is the cost of using a host with no
  native rewrite support.
- **Netlify/Vercel/Cloudflare's 200 rewrite**: unmatched paths get
  `index.html` back with a genuine `200`. This fixes the status-code
  problem but creates the opposite one — every typo'd URL now "succeeds,"
  so a broken link never surfaces as a 404 in your analytics or uptime
  checks.

This is exactly the trade-off that SSG and SSR (lessons 44–47) sidestep
entirely: when every route is a real file or a real server response, there
is no fallback to reason about, and a genuinely missing page returns a
genuine 404.

### Trailing slashes, headers, and env vars

Pick one canonical form — `/about` or `/about/` — and redirect (308) the
other to it; serving both as independently cacheable, independently
crawlable URLs is a duplicate-content problem for no benefit. Security
headers (CSP, HSTS — see lesson 67) belong in the same `_headers` /
`vercel.json` / `wrangler.jsonc` config as your cache rules, since they're
also just response headers keyed by path pattern.

Build-time environment variables (`VITE_*`) get baked directly into the
shipped JavaScript bundle — they are as public as any other string in your
`main.js`. Never put a secret behind a `VITE_` prefix; a value only your
server should see belongs in a serverless function or edge runtime that
reads it at request time (lesson 90), not in a static build.

### Preview URLs and rollbacks

Deploy previews are unauthenticated by default on most platforms and can
end up indexed by search engines if you're not careful — the fix is
`X-Robots-Tag: noindex` (or a `<meta name="robots" content="noindex">`) on
preview hosts, and, for anything sensitive, the platform's own deployment
protection (password or SSO gating). Because every deploy is an immutable,
independently addressable snapshot, a rollback is just re-pointing
production traffic at a previous snapshot's id — no revert commit, no
rebuild, no race with the next merge landing mid-rollback.

### Further reading (optional)

- [MDN: HTTP caching](https://developer.mdn.io/en-US/docs/Web/HTTP/Caching)
- [Netlify docs: redirects and rewrites](https://docs.netlify.com/manage/routing/redirects/)
- [Vercel docs: `vercel.json`](https://vercel.com/docs/project-configuration)
- [Cloudflare docs: `_redirects`](https://developers.cloudflare.com/pages/configuration/redirects/)
