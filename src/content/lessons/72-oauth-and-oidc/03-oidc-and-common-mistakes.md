# OIDC, and the mistakes everyone makes

OAuth answers "can this client do X on the user's behalf." It says nothing
about *who the user is* — that's a category error people make constantly:
"we use OAuth for login" usually means "we use OpenID Connect," a layer on
top of OAuth. **OpenID Connect (OIDC)** adds exactly one new artifact — the
**ID token** — plus a discovery mechanism and a UserInfo endpoint, and
defines precisely what "authentication" means in this world.

## The ID token

An ID token is a JWT (lesson 71's `decodeJwt`/claim-validation logic applies
directly) with a specific, registered claim set:

- `iss` — the issuer, matched against the AS's discovery document.
- `sub` — stable, unique identifier for the user *at this issuer*. Use this,
  not email, as your foreign key — email addresses get reassigned.
- `aud` — must contain your `client_id`. If it's an array with more than one
  entry, `azp` (authorized party) becomes required and must equal your
  `client_id` — this is how a multi-audience token still tells you which
  client it was actually issued to.
- `exp` / `iat` — standard JWT timing claims.
- `auth_time` — when the user actually authenticated (not when the token was
  issued — those can differ if a session was reused).
- `nonce` — echoes back a value your client generated before the redirect.
- `acr` / `amr` — authentication context class reference and authentication
  methods reference: *how* the user authenticated (password, hardware key,
  MFA-with-OTP). Useful when your API needs to require step-up auth for a
  sensitive action, not just "logged in somehow."

## `nonce`: what it actually prevents

`state` (from the OAuth layer) proves the callback belongs to a request
*your client* made. `nonce` (OIDC-specific) proves the specific **ID token**
you received was minted for *this* authentication, not replayed from an
earlier one. The client generates a fresh nonce before every redirect,
sends it in the authorize request, and — after getting the ID token back —
checks `token.nonce === theNonceItGenerated`. Skipping this check means a
captured ID token from a previous session can be replayed as if it were
fresh. `state` and `nonce` are often the same random value in simple
implementations, but they answer different questions and a careful review
checks both independently.

## Discovery and validating an ID token correctly

Every compliant OIDC provider publishes
`{issuer}/.well-known/openid-configuration` — a JSON document with the
authorize/token/userinfo endpoints and, critically, the `jwks_uri` for
fetching current signing keys. **Never hardcode an issuer's endpoints or
keys** — fetch discovery, cache it, and use it as the source of truth for
what `iss` should equal.

A correct ID token validation, in order:

1. Verify the JWT signature against a key from the issuer's JWKS (lesson 71
   covers safe `kid`-based key selection — the same rules apply here).
2. `iss` must exactly equal the issuer from discovery.
3. `aud` must contain your `client_id`; if `aud` has multiple entries,
   `azp` must be present and equal your `client_id`.
4. `exp`/`iat` within a small clock-skew leeway.
5. `nonce` must equal the value you generated for this request.
6. If you requested `max_age`, `auth_time` must be present and
   `now - auth_time <= max_age` (plus leeway) — otherwise the AS handed you
   a stale authentication and you asked for a fresh one.

## Access token vs. ID token: the mistake that keeps recurring

**The ID token is for the client, about the user. The access token is for
the API, about the request.** An ID token proves to your React app "this
person authenticated, here's who they are" — it is not a bearer credential
your API should accept as authorization for anything. It typically isn't
even meant for your API's audience (`aud` is your `client_id`, not your
API's identifier), has no `scope`, and many providers explicitly document
that their ID tokens are not to be used to call APIs.

Sending the ID token to your API as if it were an access token is common
enough to have a name — treating authentication as authorization — and it
usually "works" in testing because nothing checks `aud` server-side, until
someone points out that any client the same AS ever issued a token to can
present *its own* ID token and can't necessarily be told apart from yours
without correctly checking `aud`/`azp`. Use the access token — scoped,
audience-restricted to your API — for every API call. Use the ID token
purely client-side, to render "logged in as Jane" and to know when the
session's authentication is stale.

## Redirect URI mistakes

- **Wildcard registration** (`https://app.example.com/*`). Convenient, and
  exactly what RFC 9700 and OAuth 2.1 forbid: an AS must do exact string
  matching against a fixed, pre-registered list. A wildcard turns "redirect
  the code somewhere I control" into "redirect the code somewhere an
  attacker's subdomain or open-redirect page controls."
- **Open redirect via `state`.** If your callback handler does
  `window.location = decodeState(params.get('state')).returnTo` without
  validating that URL, you've built an open redirect using OAuth's own
  `state` parameter as the payload. `state` is for round-trip integrity
  checking, not a place to smuggle a raw, unvalidated destination URL.
- **The one sanctioned exception**: native/CLI apps redirecting to a
  loopback address (RFC 8252 §7.3) may register `http://127.0.0.1/callback`
  and get redirected to whatever ephemeral port the OS assigned at runtime
  — the AS is expected to ignore the port when comparing, but *not* the
  scheme, host, or path.

## Mix-up attacks and `iss` in the callback

If your client talks to multiple authorization servers (dev/staging AS
plus a real one, or multi-tenant setups), an attacker who controls one AS
can trick your client into sending an authorization code meant for the
*honest* AS to the *malicious* one, or vice versa — a **mix-up attack**.
RFC 9207 adds an `iss` parameter to the authorization response itself, so
the callback handler can confirm which AS actually issued this specific
response, independent of which AS the client *thinks* it was talking to.
When a provider supports it, checking `iss` on the callback (not just on
the eventual ID token) closes this off; when it doesn't, use
per-AS-distinct `redirect_uri`s as RFC 9700's fallback mitigation.

## Token leakage in URLs

Authorization codes travel in the redirect URL by design (single-use,
short-lived, and exchanged over a back channel immediately, which limits
the blast radius). Access and ID tokens should never appear in a URL —
they end up in browser history, `Referer` headers on the next navigation,
and server access logs. If a library or a hand-rolled flow puts a raw
access token in a query string "just this once," that's a bug, not a
shortcut.

## Logout is not one thing

- **RP-initiated logout** — your client redirects to the AS's end-session
  endpoint (from discovery) so the AS clears *its* session too, not just
  yours; otherwise "logging out" leaves the user silently re-authenticated
  on the next login attempt with no prompt.
- **Front-channel logout** — the AS loads a tiny iframe/image from every
  other client the user is logged into, telling each to clear its own
  session, all inside the browser the user is using right now.
- **Back-channel logout** — the AS calls each client's backend directly
  (server-to-server), which works even for clients with no open browser
  tab, but requires each client to expose a logout-notification endpoint.

## Provider quirks worth knowing before you integrate one

Google, Microsoft Entra ID, Auth0, and Okta are all OIDC-compliant, but
"compliant" leaves room to differ: Entra ID's v2 endpoint issues `aud` as
your app's client ID but nests role/group claims differently per tenant
configuration; Google's tokens use `sub` values that are stable but its
`hd` (hosted domain) claim is Google-specific, not a registered OIDC claim;
Auth0 and Okta both support custom claims namespaced under a URL (like
`https://yourapp.com/roles`) because unnamespaced custom claim names risk
colliding with future registered ones. None of this changes the validation
rules above — it changes what you can rely on being *present*.

### Further reading

- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [RFC 9207 — OAuth 2.0 Authorization Server Issuer Identification](https://datatracker.ietf.org/doc/html/rfc9207)
- [RFC 8252 — OAuth 2.0 for Native Apps](https://datatracker.ietf.org/doc/html/rfc8252)
- [RFC 9700 — OAuth 2.0 Security Best Current Practice](https://datatracker.ietf.org/doc/html/rfc9700)
