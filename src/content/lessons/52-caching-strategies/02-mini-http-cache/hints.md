Start with `lookup`. It currently returns `entries[0]` no matter what. You
need to compare the *stored* variant's recorded `varyHeaders` against the
*current* request's headers, for each header name the response's `Vary`
listed — the `varySignature` helper already does that comparison, you just
need to call it on both sides and check equality inside `.find(...)`.

---

For `save`, look at `parseCacheControl(response.headers['Cache-Control'])`.
If that has a `no-store` key at all (its value doesn't matter — presence is
enough), return immediately before touching the store.

---

For freshness, `directives['s-maxage'] ?? directives['max-age']` picks
`s-maxage` when it exists and falls back to `max-age` otherwise — pass that
into `seconds(...)` instead of `directives['max-age']` alone.

---

`withinSwr` needs the same shape as the `age < freshMs` check just above it,
but comparing against `freshMs + swrMs` instead of `freshMs` alone — and it
should only be `true` when the response isn't `no-cache` (a `no-cache`
response never gets to skip revalidation, swr window or not). You'll need to
compute `swrMs` from `directives['stale-while-revalidate']` the same way
`staleIfErrorMs` is computed from `directives['stale-if-error']` a few lines
below — that computation is currently missing entirely.
