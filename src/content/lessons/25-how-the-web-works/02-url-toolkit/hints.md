All three functions can be built on `new URL(...)` — you don't need any string splitting or
regexes. `new URL(someUrl).origin` gives you scheme + host + port already normalized (default
ports collapse away). `new URL(relative, base)` is the two-argument form of the constructor that
does href resolution for you, including `../` segments.

---

For `sameOrigin`, resist the urge to compare hostnames or paths — origin is exactly
`protocol + '//' + host` (with the port folded in only when it's non-default), and the `URL`
object computes it for you as `.origin`. Two calls to `new URL(...).origin`, one `===`.

---

For `withQuery`, `URLSearchParams` (available as `parsed.searchParams` on a `URL` instance) has
`.set(key, value)` and `.delete(key)`. Loop over `Object.entries(params)`, delete when the value is
`undefined`, otherwise set with `String(value)`. Getting sorted output takes an extra step: after
mutating, pull the entries out with `[...parsed.searchParams.entries()]`, sort that array by key,
clear `parsed.search`, then re-append in the sorted order. Don't sort by rebuilding the query
string with `Array.sort().join()` by hand — you'll fight URL-encoding edge cases that
`URLSearchParams` already gets right.

---

Something like:

```ts
export function withQuery(url: string, params: Record<string, string | number | boolean | undefined>): string {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) parsed.searchParams.delete(key);
    else parsed.searchParams.set(key, String(value));
  }
  const sorted = [...parsed.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  parsed.search = '';
  for (const [key, value] of sorted) parsed.searchParams.append(key, value);
  return parsed.href; // hash is untouched because we never touched parsed.hash
}
```

The hash survives "for free" here because `URL` stores `search` and `hash` as separate fields —
clearing `.search` never touches `.hash`, and `.href` reassembles both in the right order.
