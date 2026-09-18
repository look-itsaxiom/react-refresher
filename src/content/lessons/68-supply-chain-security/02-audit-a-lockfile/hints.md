Start with `auditLockfile`. Loop over `lock.packages` once and check the five
per-package rules independently — a single package can and should produce more than one
finding if it violates more than one rule. Use the provided `daysBetween(now, pkg.publishedAt)`
for the age check; don't parse dates yourself.
---
For the duplicate-version rule, build a map from package name to the set of distinct
versions seen (a `Map<string, Set<string>>` works well). After the main loop, walk the
map and push one `'duplicate-version'` finding for every name whose version set has
more than one entry.
---
For `typosquatSuspects`, for each `name` in `names`, check whether it exactly equals any
entry in `popular` — if so, skip it. Otherwise compute `levenshtein(name, p)` for every
`p` in `popular` and check whether any result is `1` or `2`. Collect matches into a
result array as you go, and skip a `name` you've already added (a `Set` of names added
so far avoids duplicates without needing a separate dedupe pass).
---
Don't reimplement `levenshtein` — it's provided and deliberately not part of what this
exercise grades. Call it as `levenshtein(name, popularName)`; it's symmetric, so
argument order doesn't matter.
