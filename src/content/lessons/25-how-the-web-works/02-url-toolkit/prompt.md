The platform already parses URLs for you — the `URL` constructor, not a regex you write by hand.
This exercise is about knowing which pieces of a parsed URL answer which question, using three
small pure functions.

Implement all three in `App.tsx`:

```ts
function sameOrigin(a: string, b: string): boolean
function resolve(base: string, relative: string): string
function withQuery(url: string, params: Record<string, string | number | boolean | undefined>): string
```

1. **`sameOrigin(a, b)`** — `true` if `a` and `b` share a scheme, host, and port, `false`
   otherwise. Use `origin`, not a substring check: `https://app.example.com:443/x` and
   `https://app.example.com/y` must compare equal (443 is `https`'s default port), while
   `https://app.example.com` and `https://api.example.com` must not (different subdomains are
   different origins), and `https://example.com` vs. `http://example.com` must not (different
   scheme).

2. **`resolve(base, relative)`** — resolve `relative` against `base` the way a browser resolves an
   `<a href>` or a relative `fetch()` call, and return the absolute URL as a string. `resolve(
   'https://example.com/docs/guide', '../api/users')` should land on
   `https://example.com/api/users`; a relative URL that's already absolute (starts with a scheme)
   should just resolve to itself, ignoring `base`.

3. **`withQuery(url, params)`** — return `url` with its query string replaced by the merge of its
   existing params and `params`, **sorted by key**. A key present in `params` with value
   `undefined` should be *removed* from the result instead of added. The `hash` (`#section`) on
   the original `url`, if any, must survive untouched at the end of the result. Non-string values
   (`number`, `boolean`) should be stringified the obvious way.

`App.tsx` renders a small table of example inputs and outputs for all three functions — don't
remove it, it's how the preview shows your work; feel free to add more example rows.

Don't reach for a URL-parsing regex or a third-party library — the built-in `URL` class (available
in both the browser preview and the jsdom checks) already does the parsing; your job is wiring it
up correctly, not reimplementing it.
