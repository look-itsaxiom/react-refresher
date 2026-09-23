`mini-client.ts` (read-only — open it, don't edit it) ships the previous exercise's cache
as a support file, extended with the two pieces of `typePolicies` this exercise is about:
`identify` now honors a `keyFields` policy (a composite identity like `Membership`'s
`['userId', 'orgId']`, not just `id`), and there's a place to store an *argumented* field —
`fieldStorageKey(fieldName, keyArgs, args)` plus a synthetic `ROOT_QUERY` entity, which is
literally what Apollo's own `InMemoryCache` calls the cache id holding top-level query
fields. `evict` + `gc` are given too: `evict` deletes an entity, `gc` sweeps every
`ROOT_QUERY` field afterward and drops any array entry whose ref now points at nothing.

Four exports in `App.tsx` are `TODO`.

## 1. `mergeWithKeyArgs(existing, incoming)`

The merge half of a `typePolicies` field policy shaped like Apollo's real
`{ keyArgs: ['projectId'], merge: mergeWithKeyArgs }` for a plain list field. `keyArgs`
is what `fieldStorageKey` already uses to keep `projectId: 'p1'` and `projectId: 'p2'`
in separate `ROOT_QUERY` slots — your job here is just the append: given the existing ref
array (or `undefined`, nothing cached yet) and an incoming page's refs, return the
combined list with anything already present (by `__ref`) not duplicated.

## 2. `relayStyleMerge(existing, incoming)`

The `edges`/`pageInfo` shape `@apollo/client`'s own `relayStylePagination()` helper
merges. Append `incoming.edges` onto `existing?.edges`, deduping by `cursor`. `pageInfo`:
just return `incoming.pageInfo` — whoever fetched the page you're merging in has the
freshest `endCursor`/`hasNextPage`, by construction.

## 3. `useTasksConnection(projectId)`

Ties `fetchPage` (already implemented below your TODOs — it calls the fake link and
`mergeEntity`s each returned node) to `ROOT_QUERY` storage via `relayStyleMerge`:

- Compute `storageKey = fieldStorageKey('tasksConnection', ['projectId'], { projectId })`.
- On mount, if `readRootField(client.cache, storageKey)` is `undefined`, fetch the first
  page (`after: null`) and `writeRootField` the result through `relayStyleMerge(undefined, page)`.
- `fetchMore()`: bail out if the current stored `pageInfo.hasNextPage` is false. Otherwise
  fetch with `after` set to the current `pageInfo.endCursor`, and `writeRootField` the
  *merge* of the current stored connection with the new page.
- Subscribe (`subscribe` from `mini-client.ts`) to re-render when this `storageKey`
  changes — including changes made by a `fetchMore` from a *different* mounted instance
  of the same `projectId`, or by `deleteTask`'s `gc` sweep.
- Derive `items` by mapping the stored connection's `edges` through `readEntity` — that's
  what makes a delete (which only touches `cache.entities` and `ROOT_QUERY`, never this
  hook directly) show up here too.

## 4. `deleteTask(id)`

Call the `DeleteTask` mutation through `client.link`, then `evict(client.cache, { __ref:
\`Task:${id}\` })`, then `gc(client.cache)`. Two calls, in that order — `evict` alone
would leave the id sitting in every `ROOT_QUERY` connection that had it; `gc` is what
actually removes it from the lists.
