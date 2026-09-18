Everything non-React is already wired up in `App.tsx`: a fake `transport(document,
variables)` standing in for Apollo/urql's network link (it has an in-memory `db` of
users, understands three document names — `'GetUser'`, `'GetUserWithPosts'`,
`'RenameUser'` — and a `failNext(message?)` you can call to make its *next* call reject),
plus the normalized cache from the previous exercise, already implemented and shared as
one module-level `cache`. Two hooks are left as `TODO`.

## 1. `useGraphQL(document, variables)`

```ts
function useGraphQL<T = unknown>(
  document: string,
  variables?: Record<string, unknown>,
): { data: T | null; loading: boolean; error: string | null; refetch: () => void }
```

- **Key by `document` + `variables`.** Two components calling `useGraphQL` with the
  same document and the same variables should dedupe: only one `transport()` call, no
  matter how many components ask for it at once.
- **Fetch once per key, then read from the shared cache.** On a cache miss for that key,
  call `transport`, `normalize()` the response's `data`, and `mergeEntities` it into
  `cache`. Remember which entity keys that response touched (`normalize`'s `entities`
  keys) — that's what tells this hook which cache changes are relevant to it.
- **Re-render on relevant cache changes, via `useSyncExternalStore`.** Subscribe to the
  shared `cache` (the previous exercise's `subscribe`); when a notification's changed
  keys overlap the ones this query depends on, recompute `denormalize(cache, root)` and
  hand that back as the new snapshot. `useSyncExternalStore` needs `getSnapshot` to
  return a **stable reference** until something actually changes — don't recompute
  inside `getSnapshot` itself, recompute when the cache notifies and cache the result.
- **`refetch()`** should force a fresh `transport()` call for this key regardless of
  what's cached, and update the same snapshot when it resolves.
- `error` should reflect either a rejected `transport()` promise or a response that came
  back with `errors`.

A `RequestStore` skeleton (map of key → subscribers + cached snapshot) is sketched as
comments above the hook to get you started, but the shape is yours.

## 2. `useMutationGQL(document, options)`

```ts
function useMutationGQL<TVars extends Record<string, unknown>>(
  document: string,
  options?: {
    optimistic?: (variables: TVars) => Record<string, unknown>; // shaped like the real response's `data`
    update?: (cache: Cache, data: Record<string, unknown> | undefined, variables: TVars) => void;
  },
): [mutate: (variables: TVars) => Promise<Record<string, unknown> | undefined>, state: { loading: boolean; error: string | null }]
```

`mutate(variables)`:

1. If `options.optimistic` is given, call it with `variables` to get a response-shaped
   guess, `normalize()` it, **snapshot the prior value of every entity key it touches**
   (so you can restore it later), then `mergeEntities` the guess into `cache` — this is
   what makes the UI update before the network responds.
2. Call `transport(document, variables)`. If it rejects, or resolves with `errors`, roll
   the optimistic write back: restore each touched entity to its snapshot (or `evict` it,
   if it didn't exist before the optimistic write), then surface the failure through the
   returned `state.error` and re-throw.
3. On success, `normalize()` the real response the same way and `mergeEntities` it in
   (this reconciles the optimistic guess with the real values — usually a no-op if the
   guess was right), then call `options.update?.(cache, data, variables)` for anything
   the response shape alone doesn't cover (see the concept step).

Two components both reading `User:1` — through `useGraphQL('GetUser', ...)` and
`useGraphQL('GetUserWithPosts', ...)` respectively — should both update the instant a
mutation through `useMutationGQL` writes an optimistic name, and both roll back together
if the request then fails.
