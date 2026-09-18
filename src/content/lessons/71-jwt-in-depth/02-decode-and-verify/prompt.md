# Decode, verify, and validate a JWT

`App.tsx` has three functions to implement, each building on the one before
it. Everything you need (base64url helpers, types) is already in the file.

## 1. `decodeJwt(token)`

Split the token on `.`, base64url-decode the header and payload segments,
and `JSON.parse` each one. This is decode-only — no signature check — the
same thing a client-side `jwt-decode` call does. Throw an `Error` for a
token that doesn't have exactly 3 segments, or for a segment that doesn't
decode to valid JSON.

## 2. `verifyHs256(token, secret)`

Recompute the HMAC-SHA256 signature using `crypto.subtle` and compare it to
the token's own signature segment. Two things matter more than the HMAC math
itself:

- Reject anything where `header.alg !== 'HS256'` **before** you even think
  about verifying — including `alg: none` and any other algorithm name.
  Never let the token's own header decide how it gets checked.
- Sign over the two base64url segments **as written** in the token
  (`${headerSegment}.${payloadSegment}`), not the decoded JSON.

Return `false` for anything that doesn't verify. Never throw.

## 3. `validateClaims(payload, options)`

Given an already-verified payload, check `exp`, `nbf`, `iss`, and `aud`
against `options`, with `leewaySeconds` (default `0`) applied to the time
based checks. Collect every applicable error into the `errors` array instead
of stopping at the first one; `ok` is `true` only when `errors` is empty.

All three functions are exported and called directly by the checks — you
don't need to change `App`.
