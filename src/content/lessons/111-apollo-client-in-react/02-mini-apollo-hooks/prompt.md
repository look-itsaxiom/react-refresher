No `@apollo/client` here, so you'll build the mechanic directly: a fake `link` (the exact
shape Apollo's `MockLink` uses in its own tests — `(operation) => Promise<{ data, errors? }>`),
a small `InMemoryCache`, and the two hooks on top of it. The entity store (`identify`,
`Cache.entities`) is the same `Typename:id` mechanic from lesson 77 — this exercise is about
Apollo's actual API surface around it: `readQuery`/`writeQuery`/`modify`/`watch`, then
`useQuery`'s `fetchPolicy` and `useMutation`'s `optimisticResponse`/`update`.

`App.tsx` has the fake link and demo components already wired. Six functions are `TODO`.

## 1. `readQuery` / `writeQuery`

A "document" here is `{ operation, root }` — no AST, since the fake link routes by
`operation` name and `root` says which key of the response holds the result (`'tasks'`
for a list, `'task'` for one). Both functions key the cache by `` `${operation}:${JSON.stringify(variables)}` ``
(call it the **queryKey**) — this is a simplification of what Apollo actually hashes.

- `readQuery`: if `cache.entityIds[queryKey]` exists (a list query), every id in it must
  still be present in `cache.entities` — if any is missing (an entity was evicted),
  return `undefined`, same ruling as lesson 77's `denormalize`. Otherwise return
  `{ [root]: ids.map(id => cache.entities[id]) }`. Same idea for `cache.entityRefs[queryKey]`
  (a single-entity query). No match at all: `undefined` (cache miss).
- `writeQuery`: normalize `data[root]` with `identify` (merging onto whatever's already
  stored under that entity key), record the id(s) under the queryKey, and notify
  listeners with every entity key you touched **plus** `` `Query:${queryKey}` `` — that
  extra key is what lets a watcher tell "the set of ids for this exact query changed"
  apart from "one of the entities it already had changed a field."

## 2. `modify`

`cache.modify`'s real signature accepts, per field, either a literal or an updater
`(existing) => next`. Implement both: merge the result onto `cache.entities[id]`, notify
with exactly `[id]`.

## 3. `watch`

Subscribe to the cache; call `cb()` when a notification's changed keys include
`` `Query:${queryKey}` ``, **or** overlap the query's current dependencies
(`cache.entityIds[queryKey]` or `[cache.entityRefs[queryKey]]`). This is what makes
`modify('Task:1', ...)` reach every query result that contains `Task:1` and skip every
query that doesn't — the last check in this exercise grades exactly that.

## 4. `useQuery(document, { variables, fetchPolicy })`

- Seed state from `readQuery` via `useState`'s lazy initializer, so a cache hit paints on
  the very first render — no loading flash.
- `'cache-first'`: skip the network entirely on a cache hit; on a miss, fetch through the
  given `fetchDeduped` helper (shared across every component asking for the same
  query+variables at once — the miniature's request deduplication).
- `'network-only'`: always call `client.link` directly, bypassing `fetchDeduped` — each
  mounted component gets its own request.
- `'cache-and-network'`: same direct call, but the cached value (if any) already painted
  via the initial state.
- Subscribe with `watch` too, so a cache change from *outside* this call — another
  component's fetch, a mutation, a `modify` — updates this query's rendered value.

## 5. `useMutation(document, { optimisticResponse, update })`

`mutate(variables)`: if `optimisticResponse` is given, snapshot the cache
(`snapshotCache`, already implemented), compute the guess, and call
`update?.(cache, { data: guess }, variables)` — this is what makes the guess visible
immediately, by routing it through the same cache-write path a real response uses. Then
call `link`. On failure (rejection or a response with `errors`), `restoreCache` the
snapshot, set the error, and re-throw. On success, call `update?.(cache, result, variables)`
again with the real result — see `AddTask`'s `update` below for why calling it twice (once
optimistic, once real) is exactly what reconciles a temp id with the server's real one.

Look at `AddTask`'s `update` function in the starter: it reads the current task list,
drops anything with `id === 'temp-id'`, and appends whatever `addTask` it was just given.
Called with the optimistic guess, that appends the temp task. Called again with the real
response, it removes the temp task and appends the real one. One function, two calls,
correct both times — that symmetry is the point of Apollo's real `update` API too.
