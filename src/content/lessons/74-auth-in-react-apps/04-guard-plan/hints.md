For `guardPlan`, handle the "no session" case once, before branching on the route's
`auth` value — every non-public route with no session redirects the same way,
regardless of whether it needed a role or just any user.

---

`encodeURIComponent` the route's `path` when building the redirect's `next` query
parameter — a path like `/admin/users` must not break the query string.

---

For `serverChecks`, build `mustReverifyIn` first (which of `layout`/`serverFunction`
are missing from `policy.checksIn`), then derive `sufficient` from whether that list is
empty — don't compute them independently, or they can disagree.

---

The `warning` only appears in one specific case: `checksIn` contains `'middleware'` and
neither `'layout'` nor `'serverFunction'`. An empty `checksIn`, or one that already
includes `'layout'` or `'serverFunction'` alongside `'middleware'`, gets no warning.
