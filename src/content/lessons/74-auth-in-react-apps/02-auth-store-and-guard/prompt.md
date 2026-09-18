# Build an auth store and a route guard

`App.tsx` has two pieces left unimplemented: `createAuthStore` and `RequireAuth`. The
types, a fake `Channel` for simulating cross-tab messages, and a `Redirect` marker
component are already provided — routing itself isn't real here (React Router isn't
importable in this sandbox), so a redirect is just a component that renders
`Redirected to {to}`.

## Types you're working with

```ts
type Session = { userId: string; roles: string[] } | null;
type AuthStatus = 'unknown' | 'anonymous' | 'authenticated';
type AuthState = { status: AuthStatus; session: Session };

type Api = {
  me(): Promise<Session>;
  login(creds: { username: string; password: string }): Promise<Session>;
  fetch(path: string): Promise<{ status: number; body: string }>;
  refresh(): Promise<Session>;
};

type Channel = {
  postMessage(data: unknown): void;
  onmessage: ((ev: { data: unknown }) => void) | null;
};

type AuthStore = {
  subscribe(cb: () => void): () => void;
  getSnapshot(): AuthState;
  bootstrap(): Promise<void>;
  login(creds: { username: string; password: string }): Promise<void>;
  logout(): void;
  fetchWithAuth(path: string): Promise<{ status: number; body: string }>;
};
```

## Part 1 — `createAuthStore(api, channel): AuthStore`

Build a `useSyncExternalStore`-compatible store (see
[useSyncExternalStore and useId](/lessons/09-external-stores) if you need a refresher on
the `subscribe`/`getSnapshot` contract: `getSnapshot` must return the *same reference*
until something actually changes).

- **Initial state**: `{ status: 'unknown', session: null }`.
- **`bootstrap()`**: calls `api.me()` **exactly once**, no matter how many times
  `bootstrap()` is called (cache the in-flight/completed promise and return it on
  subsequent calls). When it resolves, set state to `authenticated` with that session if
  `api.me()` returned a session, otherwise `anonymous`.
- **`login(creds)`**: calls `api.login(creds)` and sets state the same way `bootstrap`
  does based on the result.
- **`logout()`**: synchronously sets state to `{ status: 'anonymous', session: null }`,
  then calls `channel.postMessage({ type: 'logout' })` so other tabs hear about it.
- **`fetchWithAuth(path)`**: calls `api.fetch(path)`. If the result's `status` is `401`:
  call `api.refresh()` to get a new session, update the store's state to
  `authenticated` with it (or to `anonymous` if `refresh()` resolves to `null`), and
  retry `api.fetch(path)` exactly once more, returning that retry's result. **Dedupe**:
  if `fetchWithAuth` is called again while a refresh from an earlier 401 is still in
  flight, the second call must reuse the same `api.refresh()` call rather than starting a
  new one.
- **Cross-tab logout**: set `channel.onmessage` so that a message with
  `{ type: 'logout' }` (from *any* sender, including another simulated tab) sets this
  store's state to `{ status: 'anonymous', session: null }` too.

## Part 2 — `RequireAuth`

```tsx
function RequireAuth({
  store,
  roles,
  children,
}: {
  store: AuthStore;
  roles?: string[];
  children: React.ReactNode;
}) { /* ... */ }
```

Subscribe to the store with `useSyncExternalStore`. Render, in order:

1. `status === 'unknown'` → a loading indicator (any text containing "Loading" is fine).
2. `status === 'anonymous'` → `<Redirect to="/login" />` (provided — just use it).
3. `roles` is given and the session's `roles` array contains **none** of them → a
   forbidden message (any text containing "Forbidden" is fine).
4. Otherwise → `children`.

The demo `App` at the bottom wires a fake `Api` and `Channel` together so you can see it
render in the preview; you don't need to modify it.
