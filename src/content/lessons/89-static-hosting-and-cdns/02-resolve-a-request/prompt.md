# Fix the static-host router

`App.tsx` implements `resolveRequest(config, request)`, a mini version of
the rule engine behind Netlify/Cloudflare `_redirects` + `_headers`. Given
a `HostConfig` (deployed files, redirect rules, header rules, an optional
SPA fallback, and a trailing-slash policy) and an incoming `Request`, it
decides what the host serves. All the glob-matching plumbing (splats,
`:placeholder`s, trailing-slash normalization) is already written and
correct — the bug is in `resolveRequest` itself, in two places.

## The precedence rule

> Exact file match wins **unless a `force` redirect matches**.

The current code checks for a matching file first and only looks at
`force` redirects afterward, so a forced redirect can never override a
real file — exactly backwards from the rule above. Forced redirects need
to be checked *before* the file lookup.

## The HTML cache header

`defaultHeadersFor` is supposed to give unhashed HTML entry points:

```
Cache-Control: public, max-age=0, must-revalidate
```

so a deploy is always visible on the next load, while still allowing a
fast `304` instead of a full re-download. The current code returns
`'no-cache'` instead — close in spirit, wrong string, and this course's
checks compare the exact header value.

Fix both bugs. Everything else in the file — glob matching, splat and
placeholder resolution, trailing-slash handling, the directory-index
lookup (`/dir` → `/dir/index.html`), the SPA fallback, and header-rule
merging — already works; use it as reference.
