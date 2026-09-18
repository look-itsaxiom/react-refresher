# Buy, borrow, or build in 2026

Every auth implementation ends up answering the same questions — where does the session
live, how does a token get refreshed, what happens on another tab — differently. You can
answer them yourself, adopt a library that answers them for you, or pay a hosted service
to make the questions disappear. None of the three is universally right; each trades
control for speed differently.

## The landscape

**Auth.js (formerly NextAuth), v5.** The oldest of this group, framework-adjacent (deep
Next.js integration, works elsewhere too), and adapter-driven — dozens of database and
OAuth-provider adapters ship in the ecosystem. Session strategy is a real choice you
make: `jwt` (stateless, session data lives in a signed cookie, no database round-trip to
read it, harder to revoke early) or `database` (a session row you can delete server-side,
costs a lookup per request). It is config-heavy — you're composing providers, adapters,
and callbacks yourself — which is the price of its breadth.

**Clerk.** A hosted service with drop-in components (`<SignedIn>`, `<SignedOut>`,
`<UserProfile>`) and prebuilt org/team management, so a working sign-up flow with
passkeys and social login can ship in an afternoon. The cost shows up two ways: a
per-monthly-active-user bill once you're past the free tier, and lock-in — your session
format and user data live in Clerk's system, so leaving later means migrating both.

**Better Auth.** A self-hosted, TypeScript-first library that's gained real momentum
through 2025–2026 specifically as the "own your data, own your session format" answer to
Clerk's convenience. Its plugin system (organizations, passkeys, two-factor, magic links)
is opt-in rather than baked in, so a small app's bundle and config stay small. You run the
database and the session logic; nothing is hosted for you.

**Supabase Auth (GoTrue).** Comes free with a Supabase project and is the obvious choice
if you're already on Supabase's Postgres — sessions integrate directly with Row Level
Security, so `auth.uid()` inside a Postgres policy is the same identity your React app
just authenticated. The trade-off is coupling: adopting it outside a Supabase-backed
Postgres database fights the tool.

**WorkOS AuthKit.** Aimed squarely at B2B SaaS that needs enterprise SSO (SAML, SCIM
provisioning) — the features a self-serve app rarely needs but an enterprise buyer's
security team will ask about by name. Overkill for a consumer app; often the fastest path
to "yes" for one selling into enterprises.

**Passkeys** are supported, to varying depths, across all of the above as of 2026 — none
of them require you to hand-roll WebAuthn ceremonies anymore, which was not true even two
years ago.

## The "copy the code" turn

**Lucia**, once a popular lightweight session library, was deprecated in March 2025. Its
maintainer's position, and the site's current guidance, is that session-based auth is
simple enough not to need a dependency at all: it now points to a single-file reference
implementation you copy into your own repo and own outright, plus a longer-form guide
(the "Auth Book") for the reasoning behind each piece. That's a real, if opinionated,
option — appropriate once you understand sessions well enough to maintain the copy
yourself, and a bad idea if you're still learning what a session even needs to check.

## What each stores, and where

The decision that actually matters for the rest of this track: does the library give you
a `jwt`-strategy session (claims live in a cookie or token you can decode client-side) or
a `database`-strategy session (an opaque reference; the server looks up the real data)?
JWT strategies avoid a database hit per request but make early revocation hard — a
compromised session lives until its token expires, not until you notice. Database
strategies fix that at the cost of a lookup. Auth.js and Better Auth let you pick;
Clerk and Supabase choose for you (both default to a signed, short-lived token backed by
a longer-lived server-side session you can revoke).

## A decision rubric

- **Ship fastest, pay monthly, accept lock-in** → Clerk (or WorkOS if the buyer is
  enterprise).
- **Own the data and the session format, willing to configure** → Better Auth or Auth.js.
- **Already on Supabase/Postgres** → Supabase Auth; fighting the grain otherwise.
- **You fully understand sessions and want zero dependency** → copy Lucia's reference
  code.
- **Migrating off a hosted provider** → expect to re-issue every session (you cannot
  import someone else's signing key or session store), so plan a forced re-login, not a
  silent cutover.

## Multi-tab logout and session-expiry UX

Whatever you choose, two behaviors are your responsibility regardless of the library:

- **Multi-tab logout.** A user logs out in one tab; every other open tab must notice.
  `BroadcastChannel` (or a `storage` event on a shared key) is the mechanism — the
  library's client SDK usually wires this for you, but if you're building your own store,
  you own it. The exercise in this lesson builds exactly this.
- **Session-expiry UX.** Don't let a background 401 silently drop the user's unsaved
  form input. Centralize the refresh-then-logout policy from the previous concept, and
  when it does log the user out, show *why* ("Your session expired — sign in to
  continue") rather than a blank redirect that looks like a bug.

## Testing auth flows

Two tools cover almost everything:

- **MSW (Mock Service Worker)** intercepts the actual `fetch`/`XHR` calls your auth
  library makes, so a component test exercises the real request/response contract
  instead of a mocked function. Use it for unit and integration tests of login forms,
  guards, and refresh logic.
- **Playwright's `storageState`.** Log in once in a setup project, save the resulting
  cookies/localStorage to a JSON file, and every subsequent end-to-end test loads that
  state instead of repeating the login flow. This is the difference between a test suite
  that takes seconds and one that re-authenticates hundreds of times.

## Further reading

- [Auth.js v5 documentation](https://authjs.dev)
- [Better Auth documentation](https://www.better-auth.com/docs/introduction)
- [Supabase Auth overview](https://supabase.com/docs/guides/auth)
- [Lucia — a single-file auth reference](https://lucia-auth.com)
- [Playwright — authentication and `storageState`](https://playwright.dev/docs/auth)
