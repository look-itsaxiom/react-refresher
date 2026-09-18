# Validate an ID token, and check a redirect URI

`App.tsx` has two independent functions to implement.

## 1. `validateIdToken(claims, options)`

Given claims from an already signature-verified ID token, decide whether
this client should accept it. Collect every applicable error into
`errors` rather than stopping at the first one; `ok` is `true` only when
`errors` ends up empty.

- **`iss`**: error unless it exactly equals `options.issuer`.
- **`aud`**: error unless it equals `options.clientId` (string case) or
  contains it (array case).
- **`azp`** (authorized party): if `aud` is an array with more than one
  entry, `azp` is *required* and must equal `options.clientId`. Otherwise
  `azp` is optional, but if present, it must still equal `options.clientId`.
- **`exp`**: error if missing, or if `options.now > exp + leeway` (leeway
  defaults to `0`).
- **`nonce`**: error unless `claims.nonce === options.nonce` — this is what
  stops a replayed ID token from a previous authentication being accepted
  as fresh.
- **`auth_time` / `max_age`**: only checked when `options.maxAgeSeconds` is
  set. Error if `auth_time` is missing, or if
  `options.now - auth_time > options.maxAgeSeconds + leeway`.

## 2. `redirectUriAllowed(registered, actual)`

Exact string match always passes. The one carve-out (RFC 8252 §7.3, for
native/CLI apps that don't know their loopback port until runtime): if
`registered` is a loopback URI (host `127.0.0.1`, `::1`, or `localhost`),
it may match an `actual` URI on a *different port*, provided scheme, host,
path, and query string all otherwise match exactly. A `registered` value
containing `*` must never be treated as a wildcard pattern — OAuth 2.1
requires exact matching, so a registered URI with a literal `*` in it can
only ever match an identical string, which in practice means it matches
nothing real.

Both functions are exported and called directly by the checks — you don't
need to change `App`.
