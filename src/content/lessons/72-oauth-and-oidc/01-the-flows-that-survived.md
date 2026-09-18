# The flows that survived

OAuth 2.0 (RFC 6749, 2012) defined four grant types. As of September 2026, the
OAuth Working Group's consolidation draft — **OAuth 2.1** (currently
`draft-ietf-oauth-v2-1-16`, targeting IESG submission in December 2026) —
folds RFC 6749, the Bearer Token spec (RFC 6750), the native-apps BCP
(RFC 8252), and the 2025 security BCP (RFC 9700, published January 2025)
into one document, and throws two of those four grants away. If you learned
OAuth from an older tutorial, this is the "what changed" list.

## Roles, unchanged

- **Resource owner** — the user.
- **Client** — your React app, your mobile app, your backend service.
- **Authorization server (AS)** — issues tokens (Auth0, Okta, Entra ID,
  Google, or your own).
- **Resource server (RS)** — the API that accepts the access token.

## What died

**Implicit grant** (`response_type=token`) returned the access token
directly in the URL fragment, with no code-exchange step. It exists because
browsers in 2012 couldn't do cross-origin `POST` reliably. That constraint
is gone — CORS is universal — and the flow was left with only downsides: the
token sits in browser history, server logs, and the `Referer` header, with
no way to bind it to the client that requested it. OAuth 2.1 removes it
outright.

**Resource Owner Password Credentials grant** had your own app collect the
user's username and password and forward them to the AS. It trains users to
type credentials into any app that asks and gives that app raw credentials
to mishandle, log, or leak. Also removed. If you need first-party,
credential-based login without redirects, that's a different problem
(covered in the SSO/passkeys lesson), not something OAuth's grant types
should be doing.

## What survived, and how it actually runs

**Authorization Code grant with PKCE** is now the *only* browser/mobile flow,
for both confidential and public clients. Walk through it once, because
every library you'll use (`oidc-client-ts`, `openid-client`, Auth.js) is
this sequence underneath:

1. **Client generates a PKCE pair.** A `code_verifier` — 43 to 128 characters
   from the unreserved URL character set (`A-Z a-z 0-9 - . _ ~`) — held only
   by the client, never sent yet. Then a `code_challenge = base64url(sha256(
   code_verifier))`, plus `code_challenge_method=S256`.
2. **Client generates `state`** (an opaque random value it can later verify
   came back unchanged) and, for OIDC, a `nonce` (covered in the next
   concept).
3. **Client redirects the browser to the AS's authorize endpoint** with
   `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`,
   `code_challenge`, `code_challenge_method=S256`, and (for OIDC) `nonce`.
4. **User authenticates and consents at the AS.** This step never touches
   your client's origin — that's the entire point.
5. **AS redirects back to `redirect_uri`** with `code` and the same `state`
   it was given.
6. **Client validates the callback**: `state` matches what it generated,
   there's no `error` param, and there's a `code`.
7. **Client exchanges the code for tokens** in a back-channel `POST` to the
   AS's token endpoint, sending `code`, `redirect_uri`, `client_id`, and the
   **`code_verifier`** (not the challenge). The AS recomputes the challenge
   from the verifier and checks it matches the one from step 3.
8. **AS returns an access token** (and, for OIDC, an ID token; see the next
   concept) and optionally a refresh token.

PKCE's job is narrow but essential: it proves the party exchanging the code
is the same party that started the flow, without needing a client secret. A
stolen authorization code (intercepted via a misconfigured redirect, a
malicious app registered for the same custom URI scheme, or a nosy proxy) is
useless without the verifier, which never left the client. OAuth 2.1 makes
PKCE mandatory for *every* client, not just public ones — RFC 9700 already
recommended this in 2025, and 2.1 just makes it a hard requirement instead
of a strong suggestion.

## Public vs. confidential clients

A **confidential client** (a traditional server-rendered app, a backend
service) can hold a secret — it never ships to something a user controls.
A **public client** — a single-page app, a mobile app, a CLI tool — cannot;
anything embedded in browser JS or an app binary is extractable. This
matters for exactly one thing under 2.1: whether the token endpoint also
checks a `client_secret`. PKCE is required either way.

## Refresh tokens, tightened

RFC 9700 requires that a public client's refresh token be **either**
sender-constrained (bound to the client via something like DPoP, so a
stolen token is useless to anyone else) **or** subject to **refresh token
rotation**: each use returns a new refresh token and invalidates the old
one, and if an already-used (rotated-away) token is presented again, the
AS treats it as reuse — a signal of theft — and revokes the entire token
family (this is the same reuse-detection idea lesson 71 covered for
first-party refresh tokens; OAuth's version is the same mechanism at the
protocol level).

## Two hardening extensions worth knowing by name

- **PAR — Pushed Authorization Requests (RFC 9126).** Instead of putting
  every authorize parameter in the front-channel URL (visible in browser
  history, referrer headers, and to anyone glancing at the address bar), the
  client first `POST`s them to the AS over a back channel and gets back a
  short-lived `request_uri`, then redirects with just that. Shrinks the
  attack surface for parameter tampering and open-redirect-style abuse.
- **DPoP — Demonstrating Proof of Possession (RFC 9449).** Binds a token to
  a private key the client holds, by having the client sign a proof-of-
  possession header on every request. A DPoP-bound token that leaks (logged,
  intercepted) is useless to whoever leaked it, because they don't have the
  key. This is what "sender-constrained," above, means in practice.

## Two flows for non-browser cases

- **Client Credentials grant** — machine-to-machine, no user involved at
  all. A service authenticates with its own `client_id`/`client_secret` (or
  a signed JWT assertion) directly against the token endpoint and gets an
  access token scoped to itself. No authorization code, no PKCE, no user
  redirect.
- **Device Authorization grant (RFC 8628)** — for input-constrained devices
  (a smart TV, a CLI). The device displays a short code and a URL; the user
  visits that URL on a *different* device (their phone) to approve, while
  the original device polls the token endpoint until it's granted.

## Scopes are not claims are not permissions

A **scope** (`openid profile email`, or `repo:read`) is a request for
*what the client wants to be able to do* — it's negotiated between client
and AS, and the AS decides whether the user or policy allows it. A **claim**
is a fact about the user asserted in a token (`email`, `sub`). A
**permission** is an authorization decision your API makes. A token
carrying `scope=repo:write` doesn't mean the bearer has write access to
every repo — it means the *token* is allowed to be used for write-shaped
requests; whether this specific user can write to this specific repo is
still your API's job to check. Treating scope as if it were the full
authorization decision is a common and dangerous shortcut.

## Where a browser app fits: the 2026 ranking

The IETF's browser-based apps guidance (which lesson 69 covered as it
firmed up into a BCP in August 2026) ranks architectures for SPAs by how
much token-handling risk they carry, from safest to riskiest:

1. **Backend-for-frontend (BFF)** — tokens never reach the browser at all;
   the browser holds only an `HttpOnly` session cookie. Covered in depth in
   lesson 69 — this is still the recommended default.
2. **Token-mediating backend** — a thin backend does the OAuth dance and
   hands the SPA a token to attach to API calls itself, but the backend
   still owns the refresh token and the client secret (if any).
3. **Browser-held tokens** — the SPA runs the whole authorization code +
   PKCE flow itself and stores tokens in JS-accessible memory or storage.
   Sometimes unavoidable (no backend to speak of), always the highest-risk
   option: XSS becomes token theft, full stop.

Everything in this lesson's exercises — building the authorize URL,
validating the callback — is the mechanics of option 3, because that's what
can be graded as pure functions. Knowing how it works is what lets you
recognize when a library or a backend is doing it for you, and what
"correctly" looks like when you have to review one.

### Further reading

- [draft-ietf-oauth-v2-1](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/) — the consolidation draft itself
- [RFC 7636 — PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 9700 — OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/rfc9700)
- [RFC 9449 — DPoP](https://datatracker.ietf.org/doc/html/rfc9449)
