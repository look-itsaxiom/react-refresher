## The BFF pattern and the current recommendation

The IETF's OAuth working group spent years watching SPAs hold access and refresh tokens
directly in browser JavaScript, and watching that go wrong in the same handful of ways
every time. **RFC 10017, "OAuth 2.0 for Browser-Based Applications"** (published August
2026, part of BCP 212 — an IETF Best Current Practice, not just a draft anymore) is the
result, and its recommendation is blunt: **don't put tokens in the browser at all.** It
ranks three architectures in decreasing order of security — a backend-for-frontend (BFF)
first, a "token-mediating backend" second, and a browser-based OAuth client (tokens held
directly in JS) last, acceptable only when the first two are genuinely unavailable.

### What a BFF actually does

A backend-for-frontend is a server component, deployed alongside (or as part of) your
app's backend, that:

1. Performs the OAuth/OIDC flow itself — it's the OAuth client, not the browser.
2. Holds the resulting access and refresh tokens **server-side**, in memory or a session
   store, never sending them to the browser.
3. Issues the browser an ordinary **session cookie** — opaque, `HttpOnly`, `Secure`,
   `SameSite=Lax` — exactly the architecture from the first concept step.
4. On every API call the SPA makes, the BFF reads the session cookie, looks up the real
   tokens, attaches `Authorization: Bearer <token>` itself, and proxies the request to
   the actual resource server (refreshing the access token first if it's expired).

This is sometimes called the **token handler pattern**: the browser never sees a token,
ever, at any point in its lifetime. XSS in your SPA can still do damage (it can drive the
proxy, make requests as the logged-in user, and read whatever those requests return) —
but it cannot exfiltrate a bearer token for reuse from a different machine, because there
is no token to steal. That's a narrower blast radius than "the attacker now owns a
long-lived credential they can replay from anywhere," which is what XSS gets you against
a browser-held token.

### CSRF is still on the table — cookies are cookies

Putting tokens behind a cookie session doesn't make CSRF disappear; it just moves the
defense back to the cookie layer covered in lesson 66. A BFF's proxy endpoint is a
state-changing (or at least sensitive) endpoint sitting behind a cookie, so it needs the
same layered defense: `SameSite=Lax` as the floor, plus a check on the browser's own
**Fetch Metadata** header — reject any proxied call whose `Sec-Fetch-Site` isn't
`same-origin` (or `none`, for a user-typed URL/bookmark) before it ever reaches the real
API. This is cheap, requires no synchronizer token, and is exactly the kind of check a
BFF is well-positioned to centralize once instead of repeating per-endpoint.

### Why server-rendered React frameworks make this natural

A BFF sounds like new infrastructure until you notice most server-rendered React setups
already have the right shape for one. Next.js's `cookies()` API (used from a Server
Component, Server Action, or Route Handler) reads and writes the session cookie from
code that already runs on your server, next to wherever you'd store the real tokens.
React Router's `createCookieSessionStorage` gives the same thing framework-agnostically:
a `getSession`/`commitSession` pair backed by a signed, encrypted cookie, called from a
`loader`/`action` that runs server-side. Neither of these was built specifically as "a
BFF," but both already put a server boundary between the browser and any token — add a
token store and a proxy call to the resource server, and that boundary *is* a BFF. This
is a big part of why RFC 10017 treats server-rendered frameworks as the easy case: the
architecture the framework already pushes you toward is the one the RFC recommends.

### When a pure SPA (no server) is defensible

Not every app has a backend to put a BFF on — a static SPA served from a CDN with no
origin server of its own is a real, common case. RFC 10017's fallback for that case is
its second-ranked option: keep the access token in memory only (never `localStorage`,
never a JS-readable cookie — memory means it's gone on tab close or reload, which is the
point), and put the refresh token in an `HttpOnly` cookie scoped to a minimal token
endpoint, so a page-load can silently exchange it for a fresh access token without
JavaScript ever holding the refresh token. This is strictly worse than a BFF — an XSS bug
can still steal the live in-memory access token for as long as that tab is open — but it
is materially better than a token sitting in `localStorage` with no expiry pressure at
all, and it's what a lot of "SPA with a separate API, no server-rendering" architectures
land on in practice.

### Where the popular libraries land

The ecosystem has converged toward the same conclusion the RFC states outright — tokens
belong server-side when there's a server to put them on:

- **Auth.js** defaults to a JWT stored in an encrypted cookie for credential-less
  providers, but supports a database-backed session strategy, and its Next.js
  integration keeps the token handling in server-side route handlers rather than
  exposing raw provider tokens to client code.
- **Better Auth** models sessions the classic server-side way: a session row in your
  database, referenced by an opaque session token cookie — closer to lesson's first
  concept step than to a bearer-token SPA.
- **Clerk** issues short-lived signed session tokens refreshed automatically in the
  background, with the long-lived session state held on Clerk's servers rather than
  trusted to browser storage.
- **Lucia**, historically a full session-management library built on exactly the
  opaque-id-plus-database-lookup model, was deprecated as an installable package in
  March 2025; its current form is a documented, copy-into-your-project pattern rather
  than a dependency, but the pattern it teaches is unchanged: hash and store session ids
  server-side, don't hand out anything self-contained.

None of them hand a raw OAuth access token to browser JavaScript by default. That's the
industry-wide version of the same move RFC 10017 formalizes.

### Further reading (optional)

- [IETF RFC 10017: OAuth 2.0 for Browser-Based Applications](https://datatracker.ietf.org/doc/draft-ietf-oauth-browser-based-apps/)
- [Next.js: `cookies()` API reference](https://nextjs.org/docs/app/api-reference/functions/cookies)
- [React Router: Sessions (`createCookieSessionStorage`)](https://reactrouter.com/explanation/sessions-and-cookies)
- [MDN: Sec-Fetch-Site header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Sec-Fetch-Site)
