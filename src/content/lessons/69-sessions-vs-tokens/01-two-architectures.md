## Two architectures, precisely

Every "how does the browser prove who it is on the next request" scheme reduces to one of
two shapes. Confusing them — or worse, blending them without noticing — is where most auth
bugs start. Get the two architectures precise first; the BFF pattern in the next step is
just "how do I get the good properties of both."

### Cookie sessions: opaque pointer, state on the server

The browser holds an **opaque identifier** — a random string that means nothing on its
own — and the server holds the actual session record (user id, roles, issued-at, last-seen)
in a store keyed by that identifier. `Set-Cookie: sid=<random>; HttpOnly; Secure;
SameSite=Lax` is the whole client-side footprint. Every subsequent request to that origin
carries the cookie automatically — the browser does the attaching, your JavaScript never
touches it, which is exactly the property lesson 66 covered from the other side (that
automatic attachment is *why* CSRF exists as a threat).

The properties that follow from "opaque pointer, state server-side":

- **Revocation is trivial.** Delete the row, and the id is worthless the instant the
  server looks it up next — no waiting for anything to expire. This is the single biggest
  operational win over tokens, and it's why "log out everywhere" or "kill this user's
  access right now" (a compromised account, an offboarded employee) is a one-line delete
  against a session store, not a distributed problem.
- **CSRF-exposed, XSS-resistant (with `HttpOnly`).** The browser attaches the cookie
  without asking your code, which is the CSRF surface lesson 66 detailed — but a script
  running in your page via XSS can't *read* an `HttpOnly` cookie's value at all, so it
  can't exfiltrate the session id itself (it can still ride it via CSRF-shaped requests,
  which is a different attack with different defenses).
- **Scaling needs a decision.** A session lookup has to land on whichever process holds
  that session's data. **Sticky sessions** (a load balancer pins a client to one server
  by cookie or IP) avoid a shared store but couple your scaling to that pinning — a
  server restart drops every session pinned to it, and autoscaling down is now a logout
  event for whoever was stuck to the instance you killed. The alternative, a **shared
  store** (Redis, a database), decouples any request from any server at the cost of a
  network hop per session read. Almost every production system past a single instance
  picks the shared store and eats the hop; sticky sessions are a shortcut that works
  until it doesn't.
- **Cross-domain is awkward.** A cookie belongs to a domain (with `SameSite`/`Secure`
  rules layered on top). A native mobile app has no cookie jar shared with your web
  session by default, and a session cookie scoped to `app.example.com` does nothing for
  a request to `api.partner.com`. This is the case cookie sessions don't cover well.

### Bearer tokens: self-contained claims, no server lookup

The alternative puts the claims themselves — user id, roles, expiry, whatever the token
issuer signed — **inside** a token the client holds and sends explicitly, typically
`Authorization: Bearer <token>`. A JWT (lesson 71 goes deep on its structure) is the usual
shape, but the architectural properties here apply to any signed, self-contained token.

- **Stateless verification.** Any server holding the signing key's public half (or the
  shared secret, for symmetric signing) can verify the token's authenticity and read its
  claims with zero network calls and no shared store — check the signature, check
  `exp`, done. This is the entire appeal: it scales horizontally for free, and it's why
  microservices and third-party APIs default to bearer tokens instead of asking every
  service to share a session store.
- **Revocation is the cost.** A signature stays valid until `exp`, full stop — there is
  no "delete the row" move, because there is no row. Real systems buy back revocation
  with short-lived access tokens (minutes) paired with a longer-lived refresh token that
  *is* checked against a server-side store on each use — which quietly reintroduces the
  stateful lookup you were trying to avoid, just on a less-frequent path. "Stateless"
  tokens with real revocation needs end up stateful somewhere; the only question is where.
- **XSS-exposed, CSRF-immune.** Nothing attaches a bearer token automatically, so a
  forged cross-site request has no way to add an `Authorization` header the browser
  wasn't already going to send — CSRF is a non-issue by construction. The trade lesson
  66 named directly: the token now has to live somewhere your JavaScript can read it to
  attach it (memory, `localStorage`, a JS-readable cookie), and anywhere JS can read a
  credential, an XSS bug can read and exfiltrate it just as completely.
- **Cross-domain and third-party by design.** A bearer token isn't scoped to a cookie
  domain — it works for a mobile app with no cookie jar, a request to a separate API
  domain, a service-to-service call. This is the case tokens cover and cookies don't.

### Session lifecycle rules, either architecture

Whichever shape holds the credential, the record it points to (or the claims it carries)
needs the same lifecycle discipline. OWASP's Session Management Cheat Sheet is the
reference here, and its numbers are worth knowing precisely rather than approximately:

- **Identifier entropy.** A session id (or any anti-guessing token) needs **at least 64
  bits of entropy** — with hex encoding that's a minimum of 16 characters of true
  randomness, not 16 characters of `Date.now()` and a counter. Anything guessable is
  equivalent to no authentication at all; use a CSPRNG (`crypto.randomBytes`,
  `crypto.getRandomValues`), never `Math.random()`.
- **Idle timeout.** Expire a session after a period of *inactivity* — commonly 2–5
  minutes for high-value applications (banking, admin panels) and 15–30 minutes for
  low-risk ones. This is a sliding window: each valid request should push the deadline
  out, not just count down from login.
- **Absolute timeout.** Expire a session after a fixed span regardless of activity — an
  office-hours application might allow 4–8 hours before forcing re-authentication, no
  matter how active the user stayed. Idle and absolute timeouts are independent checks;
  a session can fail either one.
- **Rotation on privilege change.** Issue a *new* session identifier — not just update
  the same one — on login, and again on any privilege escalation (a user promoted to
  admin mid-session, a step-up to a sensitive action). This closes session fixation
  (an attacker who planted a pre-login session id can't ride it into a post-login,
  now-privileged session) and limits how long a leaked identifier stays useful.
- **Binding, cautiously.** Tying a session to a client fingerprint (IP address, User-Agent)
  adds a check, but mobile networks rotate IPs mid-session and browsers update
  User-Agent strings on their own schedule — bind too strictly and you log out honest
  users constantly. Where it's used, it's usually a soft signal (log and flag) rather
  than a hard invalidation.

None of this is specific to cookies. A refresh token, a database-backed API key, or a
long-lived bearer token all need the same entropy, timeout, and rotation discipline — the
architecture changes where the check happens, not whether you need it.

### Further reading

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [Auth0: Token Best Practices](https://auth0.com/docs/secure/tokens/token-best-practices)
