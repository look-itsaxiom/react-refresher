# Anatomy and verification

A JWT is three base64url segments joined by dots: `header.payload.signature`. No
segment is encrypted — a JWT (a JWS, specifically — a signed JWT) only guarantees
integrity and authenticity, not secrecy. Anyone who has the token can read the
header and payload with `atob`. If you need the claims themselves hidden from the
bearer, you want a JWE (JSON Web Encryption, RFC 7516), which is rarer in practice
and out of scope here. Assume every JWT you issue is fully readable by whoever
holds it, and never put anything in the payload you wouldn't put in a URL query
string.

`base64url` is not the same alphabet as base64: it replaces `+` with `-` and `/`
with `_`, and drops the `=` padding, because `+`, `/`, and `=` aren't safe in URLs
and headers unescaped. Browsers don't have a `atob`/`btoa` variant that speaks
base64url natively, so decoding a JWT segment means swapping the characters back,
restoring padding, and then calling `atob`:

```ts
function base64urlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}
```

## Header and claims

The header is almost always just two fields: `alg` (the signing algorithm) and
`typ` (conventionally `"JWT"`). If the token came from a JWKS-backed issuer, it
also carries `kid` — a key identifier telling the verifier *which* key to check
the signature against, because an issuer usually has more than one active key at
once (see the next concept for rotation). The payload holds claims. RFC 7519
registers a handful with defined meaning:

- `iss` — who issued the token (a string, usually a URL).
- `sub` — who the token is about (the subject, usually a stable user id).
- `aud` — who the token is *for*. A single string or an array of strings; if your
  API isn't in the list, the token wasn't meant for your API, full stop.
- `exp` / `nbf` / `iat` — expiry, "not before", and "issued at", all as seconds
  since the Unix epoch (not milliseconds — a common off-by-1000 bug).
- `jti` — a unique id for this specific token, useful for denylisting one token
  without touching the rest of a user's session.

None of these are enforced by the format. A JWT with no `exp` is perfectly valid
JSON and a perfectly valid signature — nothing stops an issuer from minting
tokens that never expire unless the verifier's code checks for it.

## Symmetric vs. asymmetric algorithms

`HS256` (HMAC-SHA256) uses one shared secret for both signing and verifying. It's
appropriate when the same party — one backend — does both. It is *not*
appropriate when a third party needs to verify tokens it didn't issue, because
verifying an HMAC requires the same secret used to sign it, and now every
verifier is a potential leak point for a secret that lets it also *forge*
tokens.

`RS256`/`PS256` (RSA) and `ES256` (ECDSA) are asymmetric: a private key signs, a
public key verifies. This is the right shape for OAuth/OIDC-style systems where
many services (or a browser) need to check a token's signature but only the
identity provider should ever be able to mint one. `EdDSA` (Ed25519) is a newer,
faster, simpler-to-implement-correctly alternative to ECDSA that's seeing wider
adoption. This lesson's exercises only implement HS256 verification by hand —
RSA and ECDSA signature math is real cryptography with real ways to get subtly
wrong, and production code should use a vetted library (see the next concept)
rather than a hand-rolled implementation either way.

## The verification algorithm, in order

A correct verifier does these steps *in this order*, and the order matters:

1. **Parse** the token into exactly three segments. Reject anything else outright
   — a token with two segments, or four, is malformed, not "maybe valid."
2. **Check `alg` against an allowlist your code controls**, before looking at
   anything else. Never read the algorithm the token claims and dispatch on it.
3. **Look up the verification key** — by `kid` if present, against your own
   configured JWKS or secret, never by trusting a key the token itself points to.
4. **Verify the signature bytes.**
5. **Check `exp`/`nbf` with a small clock-skew leeway** (30–120 seconds is
   typical — enough to absorb clock drift between machines, not enough to make
   expiry meaningless).
6. **Check `iss` and `aud`** against your own expected values.

Steps 2 and 3 are where most real-world JWT vulnerabilities live, because naive
implementations let the *token itself* tell the verifier how to verify it:

- **`alg: none`.** The JWT spec defines an `none` algorithm meaning "unsigned."
  Some early libraries would see `alg: none` in the header and skip verification
  entirely, because the token told them to. A verifier that reads `alg` from the
  token and branches on it — instead of checking it against an allowlist first —
  accepts a token anyone could forge with nothing but a text editor.
- **Algorithm confusion (RS256 → HS256).** If a verifier is configured with an
  RSA *public* key but blindly trusts the token's claimed `alg`, an attacker can
  write `alg: HS256` in the header and sign the token using the public key
  (which is, by definition, public) as an HMAC secret. The verifier, told to use
  HS256, computes the same HMAC and it matches — the attacker just forged a
  token for a system that thought it only issued RS256 tokens. The fix is that
  the verifier — not the token — decides which algorithm and which key are used
  for a given issuer; a public key from an RS256 JWKS entry should never be handed
  to an HMAC verifier.
- **`kid` injection.** If `kid` is used to build a file path or a database/cache
  lookup key without validation, a crafted `kid` like `../../etc/passwd` or
  `' OR '1'='1` turns key lookup into a path-traversal or SQL-injection vector.
  Treat `kid` as untrusted input: look it up against a fixed, known set of key
  ids (a JWKS you fetched from the issuer), never interpolate it into a query or
  path.
- **Weak HMAC secrets.** An HS256 secret is a bearer credential — if it can be
  brute-forced or was ever hardcoded into a repo, anyone who has it can mint
  arbitrary tokens. Use a long, random secret and treat it like a password, not
  a config string.
- **Missing `aud` checks.** A token that's valid — correctly signed, unexpired —
  but issued for a *different* audience is still not a token your API should
  accept. Skipping the audience check is how a token meant for one service ends
  up being replayed against another.

## What the client may do with a token

A React app can `jwt-decode` an access token to read claims for **display
only** — showing a username, a role badge, an expiry countdown. That's it. The
client never verifies signatures (it usually doesn't have the key, and even if
it's a public key, "verified in the browser" doesn't mean anything to your
server — the server must independently verify every token it receives). A
decoded-but-unverified payload is not more trustworthy than a string the user
typed into a text box; it's just as easy to forge, so any authorization
decision — what a user is allowed to do — has to happen on the server against a
token the server verified itself.

## Further reading (optional)

- [RFC 7519 — JSON Web Token](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 8725 — JSON Web Token Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725)
- [RFC 7518 — JSON Web Algorithms](https://www.rfc-editor.org/rfc/rfc7518)
- [Auth0: JWT algorithm confusion attacks](https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/)
