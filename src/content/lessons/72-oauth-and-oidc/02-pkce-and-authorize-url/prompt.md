# PKCE, the authorize URL, and the callback

`App.tsx` has four functions to implement. `generateVerifier` and
`codeChallenge` produce the PKCE pair; `buildAuthorizeUrl` uses the result
to construct the redirect; `validateCallback` checks what comes back.

## 1. `generateVerifier(length, randomSource)`

Produce a `length`-character string drawn from the unreserved character set
(`A-Z a-z 0-9 - . _ ~`), using `randomSource` for entropy. Throw an `Error`
if `length` is outside RFC 7636's 43-128 range. The default `randomSource`
uses `crypto.getRandomValues`; tests may inject a different one to make the
output deterministic.

## 2. `codeChallenge(verifier)`

`base64url(SHA-256(verifier))`, computed with `crypto.subtle.digest`. This
one has a fixed answer for a fixed input — RFC 7636's own test vector — so
get the encoding exactly right, not just "close."

## 3. `buildAuthorizeUrl(params)`

Build the authorize redirect: `response_type=code`, `client_id`,
`redirect_uri`, `scope` (the scopes array, space-joined), `state`, `nonce`,
`code_challenge`, and `code_challenge_method=S256`, all as query parameters
on `params.issuerAuthorizeEndpoint`. Use `URL`/`URLSearchParams` rather than
concatenating strings by hand — it handles encoding correctly and the
checks parse the result as a URL, not as literal text.

## 4. `validateCallback(callbackUrl, options)`

Given the URL the AS redirected back to, decide whether it's safe to
proceed to a token exchange. Check things in this order — it's not
arbitrary:

1. `state` must match `options.expectedState`, or `{ ok: false, error:
   'state_mismatch' }`. Nothing else in the response can be trusted until
   this passes.
2. If `options.expectedIssuer` is set and the callback has an `iss` param
   that doesn't match it, `{ ok: false, error: 'issuer_mismatch' }` (RFC
   9207's mix-up defense).
3. If the callback has an `error` param, return `{ ok: false, error:
   <that value> }` — echo the AS's own error code.
4. If there's no `code` param, `{ ok: false, error: 'missing_code' }`.
5. Otherwise, `{ ok: true, code: <that value> }`.

All four functions are exported and called directly by the checks — you
don't need to change `App`.
