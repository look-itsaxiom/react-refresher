# Refresh rotation with reuse detection, and safe JWKS key selection

`App.tsx` has two independent pieces to implement.

## 1. `createRefreshRotation({ clock, idFactory, ttlMs? })`

A factory for a small in-memory refresh-token store implementing rotation
with reuse detection, the way the OAuth 2.0 Security BCP describes it. Track
each token's family, whether it's been used, and when it expires (`ttlMs`
defaults to 30 days).

- `issue(userId)` mints a new token and a new family, returns both ids.
- `rotate(refreshToken)` exchanges an unused, unexpired token for a new one
  in the *same* family. Presenting a token that's already been used — the
  reuse case — must revoke the **entire family**, not just that token, and
  return `{ error: 'reuse-detected' }`. An unrecognized or expired token
  returns `{ error: 'invalid' }`.
- `revokeFamily(familyId)` kills every token in a family directly (a manual
  "sign this user out everywhere" action).
- `isValid(refreshToken)` is `true` only for a token that exists, hasn't
  been used, hasn't expired, and whose family hasn't been revoked.

`clock` and `idFactory` are injected so the checks can control time and ids
deterministically — call `clock()` for the current time and `idFactory()`
whenever you need a new unique id, rather than reaching for `Date.now()` or
`Math.random()` directly.

## 2. `jwksSelectKey(jwks, header)`

Given a JWKS document (`{ keys: [...] }`) and a token's header, return the
one key that should verify it: matched by `kid`, then checked against the
header's `alg` and the key's own `use`. An unrecognized `kid` — or a `kid`
missing from the header entirely — must throw, never silently fall back to
"the first key in the set." A key whose own `alg` or `use` doesn't match is
also a throw: that's what stops a key meant for one algorithm from being
used to verify a token that claims a different one.
