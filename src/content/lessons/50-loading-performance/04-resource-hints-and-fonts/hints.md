`planResourceHints` is four small loops in a fixed order: push a `modulepreload` per
chunk, then (if present) one `preload` for the LCP image, then a `preconnect` per
third-party origin, then a `prefetch` per chunk of each next route. Building the array in
that order is the whole "ordering" requirement — you don't need to sort anything
afterward.

---

Look up `manifest.routes[route]` once at the top and return `[]` immediately if it's
missing (`undefined`), before you touch anything else. Same idea for each entry in
`nextRoutes` — look it up in `manifest.routes` and skip it if it's not there instead of
throwing.

---

For `fontStrategy`, write a small helper that builds one `@font-face` string given a
font and a `font-display` value, and a second helper that builds the fallback block from
`fallbackMetrics`. Then the exported function is just: branch on `role === 'body'`, call
the first helper either way, and only call the second helper (and only if
`fallbackMetrics` exists) in the body-font branch.

---

The fallback `@font-face`'s `font-family` should be `` `${font.family} Fallback` `` and
its `src` should be `` `local('${metrics.fallbackFamily}')` ``  — those are two different
strings using two different fields, easy to swap by accident. `size-adjust` and
`ascent-override` are plain numbers turned into percentages (`` `${n}%` ``), not already
formatted with a `%` in the input.
