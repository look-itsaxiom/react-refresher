`sriIntegrity` has a `digestBase64` helper right above it that already
does the hashing correctly — it just isn't being called. Replace
`btoa(content)` with `await digestBase64(content, ALGO_NAME[algorithm])`.

---

For `verifyIntegrity`, the fix is in how `chosen` (or whatever you call the
picked entry) gets picked: instead of always taking `parsed[0]`, reduce
over `parsed` comparing `STRENGTH[p.algorithm]` and keep the strongest
one. Everything after that line — filtering candidates by algorithm,
hashing, comparing — already works once the right entry is chosen.

---

A `reduce` that keeps the current best works well here:
`parsed.reduce((best, p) => (STRENGTH[p.algorithm] > STRENGTH[best.algorithm] ? p : best))`
— no initial value needed since `parsed` is already checked to be
non-empty above it.
