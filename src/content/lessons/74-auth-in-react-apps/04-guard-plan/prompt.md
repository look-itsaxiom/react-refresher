# Plan route guards, and check that a server plan is actually enough

Two pure functions. No component this time — the default `App` just renders their output
so the preview shows something; you don't need to touch it.

## Part 1 — `guardPlan(routes, session): Record<string, Decision>`

```ts
type RouteAuth = 'public' | 'user' | { roles: string[] };
type Route = { path: string; auth: RouteAuth };
type Session = { userId: string; roles: string[] } | null;
type Decision =
  | { kind: 'allow' }
  | { kind: 'redirect'; to: string }
  | { kind: 'forbidden' };
```

For each route, decide:

- `auth === 'public'` → `{ kind: 'allow' }`, regardless of `session`.
- `auth === 'user'`:
  - `session` is `null` → `{ kind: 'redirect', to: '/login?next=' + encodeURIComponent(route.path) }`.
  - `session` is present → `{ kind: 'allow' }`.
- `auth` is `{ roles }`:
  - `session` is `null` → same redirect as above (an anonymous visitor is asked to log
    in first, not told they're forbidden — they haven't proven who they are yet).
  - `session` is present but shares **none** of `auth.roles` → `{ kind: 'forbidden' }`.
  - `session` is present and shares **at least one** of `auth.roles` → `{ kind: 'allow' }`.

Return a plain object keyed by each route's `path`.

## Part 2 — `serverChecks(request, session, policy): ServerCheckResult`

```ts
type Layer = 'middleware' | 'layout' | 'serverFunction';
type Request = { path: string; requiresAuth: boolean };
type Policy = { checksIn: Layer[] };
type ServerCheckResult = {
  mustReverifyIn: Layer[];
  sufficient: boolean;
  warning?: string;
};
```

This models the point from the first concept step: a `middleware`/proxy check is a fast
first pass, but it is not enough on its own — `layout` and `serverFunction` are the
layers that can actually be reached directly (a Server Function can be called without
going through the page that renders it), so they're the ones that **must** re-verify.

- If `request.requiresAuth` is `false`: `{ mustReverifyIn: [], sufficient: true }` (no
  `warning` key at all).
- Otherwise, `mustReverifyIn` is whichever of `'layout'` and `'serverFunction'` are
  **not** already listed in `policy.checksIn` (order: `layout` before `serverFunction`).
  `sufficient` is `true` exactly when `mustReverifyIn` is empty.
- Set `warning` to a string mentioning `"CVE-2025-29927"` when `policy.checksIn` contains
  `'middleware'` and contains **neither** `'layout'` nor `'serverFunction'` — a plan that
  checks only at the edge. Leave `warning` unset (`undefined`, and don't include the key)
  in every other case, including when `policy.checksIn` is empty.

`session` is accepted as a parameter (a real implementation might use it to decide
*what* to re-verify) but this version's rules above don't need to inspect it — it's
there so the signature matches how you'd actually call this from a request handler.
