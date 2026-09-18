# Where auth state lives in a React app

Every other lesson in this track was about a piece of the puzzle: what a session cookie
holds, what a JWT proves, what a passkey ceremony looks like. This lesson is about the
part that actually lands in your component tree — how a React app represents "who is
logged in" without flashing the wrong UI, racing itself on a token refresh, or trusting
the browser to enforce something only a server can enforce.

## The shape of client auth state

A logged-in/logged-out boolean is not enough. On the very first render, the app usually
does not know yet — there's a session cookie or a token to check, and that check is
async. Model auth state as three states, not two:

```ts
type AuthStatus = 'unknown' | 'anonymous' | 'authenticated';
```

`unknown` is not "loading" in the generic sense — it's specifically "we haven't
determined whether there's a session yet." Every screen that cares about auth branches on
this three-way state, not a boolean, or you'll ship a component that renders the logged-out
UI for a frame before the real session arrives.

## Avoiding the flash

The naive version — render logged-out UI, fetch `/me`, swap to logged-in UI — produces a
visible flash on every hard refresh: the "Sign in" button flickers before the user's
avatar replaces it. Three ways to avoid it, in order of how much infrastructure they need:

1. **A loading gate.** Render nothing (or a skeleton) while `status === 'unknown'`, and
   only mount the real tree once it resolves. Cheapest option, still shows a blank beat.
2. **An SSR-provided initial session.** If the server already knows the session (it read
   the cookie to render the page), it can serialize that session into the initial HTML
   and hydrate the client store with it already resolved to `authenticated` or
   `anonymous`. No `unknown` state ever reaches the browser. This is what Next.js Server
   Components do when a layout calls the session-reading function itself, rather than
   waiting for a client-side fetch.
3. **`use()` on a session promise.** Pass a promise for the session down from a Server
   Component, and read it in a Client Component with `use(sessionPromise)`. React
   suspends the subtree until it resolves, which composes with `<Suspense>` boundaries
   you already have instead of a bespoke loading flag.

## Where the state actually lives

Three candidates, and they solve different problems:

- **An external store (`useSyncExternalStore`).** The session is not really "component
  state" — it's ambient, shared, and mutated from places with no component instance at
  all (an `onmessage` handler for cross-tab logout, a `fetch` wrapper reacting to a 401).
  A store built the way [[09-external-stores]] describes — `subscribe` + `getSnapshot` —
  is the right shape: one source of truth, read via the hook wherever it's needed, with no
  provider tree to thread through every layout.
- **Context.** Fine for threading the store's *read* access down without a global import,
  but don't put the mutable session object directly in a `useState` inside a context
  provider — every consumer re-renders on every session change, and you lose the "mutate
  from outside React" capability the store gives you for free.
- **TanStack Query (or any cache library) for the session.** Treating `/me` as just
  another query — with `staleTime`, background refetch, and `invalidateQueries` on
  login/logout — is a legitimate, common choice, especially if the rest of your data
  layer already runs through Query. It costs you a dependency and gives you retry/backoff
  and devtools for free. The store approach above assumes you don't want that dependency
  or want tighter control over refresh semantics.

## Protected routes are UX, not security

A `<RequireAuth>` wrapper that redirects an anonymous visitor to `/login` is a courtesy —
it stops a user from staring at a broken page. It is not what stops an attacker from
reading data through your API. The server enforces that, every time, on every request,
regardless of what the client rendered. Treat every client-side guard as advisory.

This distinction has a name because a real vulnerability made it painfully concrete:
**CVE-2025-29927**, disclosed in March 2025, let a crafted request skip a Next.js
middleware's authorization check entirely — the middleware ran, decided nothing, and the
request reached the page anyway. Sites that put *all* of their auth logic in middleware
and nowhere else were exposed; sites that also checked in the data layer were not. The
patched framework closed the specific bypass, but the lesson generalizes past this one
CVE: a single edge layer is one bug away from being skippable, so re-verify at every
layer that can reach data.

- **React Router 8**: a route's `loader` can throw `redirect('/login')` before the route
  ever renders — that's the client-side courtesy. Loaders run on every navigation to that
  route, so the check happens even on client-side transitions, not just hard loads.
- **Next.js**: the edge `proxy.ts` (the renamed `middleware.ts` as of Next.js 16) is a
  fast, cheap first check — good for redirecting obviously-anonymous traffic before it
  costs you a render. But Auth.js's own docs are explicit that you should not rely on it
  exclusively: "ensure that the session is verified as close to your data fetching as
  possible." Check again in the layout that renders the protected UI, and check again
  inside every Server Function that mutates data, because a Server Function can be called
  directly, bypassing the page and its layout entirely.
- **Server Components reading the session** should call the same `auth()`-style function
  the layout uses, not trust a prop that says `isLoggedIn` — that prop could have been
  computed before a session expired, or on a route that skipped the check.

## Roles, permissions, and centralized failure handling

Beyond authenticated/anonymous, most apps need "authenticated *and* allowed to do this."
Model it as typed abilities rather than string comparisons scattered through the
codebase:

```ts
type Ability = 'billing:read' | 'billing:write' | 'users:invite';
function can(session: Session, ability: Ability): boolean {
  return session.abilities.includes(ability);
}
```

And handle 401/403 in one place — a `fetch` wrapper or a query client's error handler —
rather than in every call site. The common policy: on a 401, attempt exactly one silent
refresh; if the retry also fails, log the user out and redirect. On a 403, don't retry —
the user is authenticated but not allowed, and no refresh changes that.

## Further reading

- [Auth.js — Protecting resources](https://authjs.dev/getting-started/session-management/protecting)
- [React Router — `redirect`](https://reactrouter.com/api/utils/redirect)
- [React docs — `use`](https://react.dev/reference/react/use)
- [Next.js — Middleware / Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/middleware)
