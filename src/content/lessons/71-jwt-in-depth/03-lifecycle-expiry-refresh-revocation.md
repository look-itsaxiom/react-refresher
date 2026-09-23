# Lifecycle: expiry, refresh, revocation

A signed token can't be edited after issuance, and that's the whole problem
with revocation: there's no server-side "undo." If a JWT is compromised, or a
user logs out, or an admin disables an account, the token itself keeps
verifying successfully right up until `exp` — the signature never becomes
invalid on its own. Everything in this concept is about living with that fact.

## Short-lived access tokens, longer-lived refresh tokens

The standard shape: an **access token** (usually a JWT) is short-lived — 5 to 15
minutes is common — and sent on every API request. A **refresh token** is
longer-lived (hours to weeks) and used only to get a new access token when the
old one expires. This bounds the damage of a leaked access token to its short
window, while the refresh token — which matters more and lives longer — is
handled with more care: usually not readable by JavaScript at all (an
`HttpOnly` cookie), sent to one dedicated refresh endpoint, and it's the refresh
token whose lifecycle this concept is mostly about. This is not the session-vs-token
question — see the sessions lesson in this track for how the two approaches to
holding server-side state compare. Here, assume you've chosen tokens and want to
run refresh safely.

## Rotation and reuse detection

**Refresh token rotation** means every time a refresh token is used, it's
invalidated and replaced with a new one — a refresh token is single-use. This
turns a leaked-and-replayed refresh token into a detectable event: if the
legitimate client and an attacker both hold a copy of the same refresh token,
whichever one uses it first gets a new token and invalidates the old value; the
second party to try presents a token that's already been marked used. That's
**reuse**, and the standard response (from the OAuth 2.0 Security Best Current
Practice, RFC 9700) is to treat it as a signal of compromise: revoke the entire
**token family** — every token descended from the original issuance — not just
the one reused token, and force the legitimate user to re-authenticate. Tracking
a `familyId` alongside each token is what makes "revoke everything descended
from this" a single lookup instead of a graph walk.

This is exactly what the second exercise in this lesson implements: `issue`
starts a family, `rotate` swaps the current token for a new one and detects
reuse, and `revokeFamily` cuts off every token in a family at once.

## Denylists and `jti`

For access tokens, rotation isn't practical — they're meant to be used
repeatedly within their short lifetime without a round trip. If you need to kill
one *specific* access token before it expires (a stolen laptop, an incident
response action), a **denylist** keyed by `jti` is the usual tool: a small,
fast store (Redis, typically) of revoked token ids, checked on every request in
addition to signature verification. This reintroduces a database read on the
hot path — the exact cost JWTs were chosen to avoid — so denylists are kept
small by relying on short access-token lifetimes to age entries out, rather than
using them as the primary revocation mechanism for everything.

**Logout** with JWTs is a related gap: deleting the token client-side (clearing
storage, clearing the cookie) stops that browser tab from *sending* the token,
but a copy taken before logout — from a proxy log, a browser extension, a
different device that never got the logout — still verifies until `exp`. A
denylist entry for that token's `jti`, or revoking its refresh family so it
can't be renewed, are the two ways to make logout actually mean something before
expiry, rather than relying on expiry alone.

## Key rotation and JWKS caching

Asymmetric issuers publish their current public keys at a **JWKS** endpoint
(`/.well-known/jwks.json` by convention) — a JSON document listing keys, each
with a `kid`. Verifiers fetch and cache this document rather than hitting it on
every request, which creates a real tension: cache it too long and a just-rotated
key isn't recognized yet (new tokens fail verification); cache it too short and
you're back to a network round trip per request. Libraries like `jose` handle
this with a cache that respects a TTL and refetches on an unrecognized `kid` —
but only up to a rate limit, so an attacker spamming random `kid` values can't
turn "refetch on unknown kid" into a denial-of-service against your own JWKS
endpoint.

## Sender-constraining: DPoP and mTLS

A bearer JWT — the kind covered so far — authorizes *whoever holds it*, full
stop; there's no check that the holder is the party it was issued to. **DPoP**
(RFC 9449, Demonstrating Proof-of-Possession) and **mutual TLS** (RFC 8705) are
both ways to bind a token to a specific client so a stolen token alone isn't
enough — DPoP has the client sign a proof with a private key it holds on every
request; mTLS binds the token to the client's TLS certificate. As of 2026,
adoption is real but still mostly in higher-security contexts (banking-grade
OAuth profiles, some identity providers) rather than the default for a typical
SPA-to-API setup — worth knowing exists, not yet something to reach for by
default.

## JWT-as-session anti-patterns

Treating a JWT as if it *were* the session — packing it with everything a
session object might hold — causes two recurring problems. First, **size**:
every claim goes into every cookie or `Authorization` header on every request;
a JWT with a user's full permission list can balloon into kilobytes sent
repeatedly for no benefit. Second, **staleness**: claims are frozen at issuance.
A role change, a permission revocation, a "ban this user now" action doesn't
take effect until the token expires and a new one is issued with fresh claims
— which is a real, and often surprising, delay if access-token lifetimes are
generous. Keep JWT payloads small and short-lived precisely so staleness windows
stay short too.

## Alternatives: opaque tokens, PASETO

An **opaque token** is a random string with no embedded structure — the server
looks it up in a database (an "introspection" call, in OAuth terms) to find out
who it belongs to and whether it's still valid. That database read is the exact
cost JWTs avoid, but it buys instant revocation: delete the row, the token is
dead immediately, no `exp` to wait out. **PASETO** (platform-agnostic security
tokens) is a JWT-shaped alternative designed to remove the algorithm-confusion
class of bugs entirely — a PASETO token embeds a version+purpose in its format
that fixes the algorithm at the protocol level, so there's no `alg` header for
an attacker to lie about. It remains an IETF draft rather than an RFC as of
2026, with real but smaller adoption than JWT.

## Library guidance

Use [`jose`](https://github.com/panva/jose) for both signing and verification
in Node and the browser — it's actively maintained, has first-class JWKS and
algorithm-allowlist support, and defaults to safe behavior. `jsonwebtoken` is
still widely deployed but ships legacy defaults that require care: it will
verify without an explicit `algorithms: [...]` allowlist unless you pass one,
which reopens exactly the algorithm-confusion risk from the previous concept.
If you're maintaining code that uses it, always pass an explicit `algorithms`
array to `verify()`; for new code, reach for `jose` instead.

## Further reading (optional)

- [RFC 9700 — Best Practices for OAuth 2.0 Security](https://www.rfc-editor.org/rfc/rfc9700)
- [RFC 9449 — OAuth 2.0 Demonstrating Proof of Possession (DPoP)](https://www.rfc-editor.org/rfc/rfc9449)
- [Auth0: Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
- [PASETO specification](https://paseto.io/)
