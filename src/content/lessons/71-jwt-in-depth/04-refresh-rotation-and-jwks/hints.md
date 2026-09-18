Model the store as two closures-over-state: a `Map<string, TokenRecord>`
keyed by the token string itself (with `familyId`, `usedAt`, `expiresAt` on
the record), and a `Set<string>` of revoked family ids. `issue`, `rotate`,
`revokeFamily`, and `isValid` all close over the same two collections and
`clock`/`idFactory` from the outer function's parameters.

---

`rotate`'s order of checks matters: look the token up first (missing or its
family already revoked → `'invalid'`), *then* check `usedAt !== null`
(→ revoke the family, return `'reuse-detected'`), *then* check expiry
(→ `'invalid'`), and only after all of that mark it used and mint the
replacement. Reuse detection has to fire even for a token whose family
hasn't been touched by anything else yet — it's purely "was this exact
token already exchanged once."

---

For `jwksSelectKey`, `jwks.keys.find((k) => k.kid === header.kid)` gets you
the candidate (or `undefined` for a `throw`). Once you have it, two more
guards, both throwing: `key.alg && key.alg !== header.alg`, and
`key.use && key.use !== 'sig'`. The `&&` matters — a key with no `alg` or
`use` field at all isn't a mismatch, it just doesn't constrain that check.
