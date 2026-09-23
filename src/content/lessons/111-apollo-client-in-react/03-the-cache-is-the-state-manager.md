# The cache is the state manager

The pitch behind Apollo's normalized cache, stated plainly: once an entity is
normalized in, every query that includes it stays consistent for free, and a lot of what
you'd reach for a global store (Redux, Zustand) to do — "this piece of server-derived
state needs to update everywhere it's shown" — is just what `InMemoryCache` already does.
The exercise after this step builds `typePolicies` and pagination on the mini client from
the last exercise; this step is the vocabulary for why each piece exists.

## Normalization keys

Default identity is `__typename` plus `id` (or `_id`, checked as a fallback). Two
failure modes worth knowing by name because they're exactly the "why is my UI stale"
bugs that come up in an interview:

- **Missing `id` in the query.** If a field on `Task` isn't selected but `id` is, fine —
  but if `id` itself isn't selected, Apollo can't normalize the object at all; it gets
  cached inline under its parent instead of as its own entity, and a mutation that
  updates that `Task` by id elsewhere in the cache never reaches this copy.
- **Composite identity.** Some types don't have a single `id` — a `Membership` might be
  identified by `(userId, orgId)` together. `typePolicies: { Membership: { keyFields:
  ['userId', 'orgId'] } }` tells the cache to build the key from both fields instead of
  a plain `id`.

Not everything should be an entity. An `Address` or `Money` embedded value with no
identity of its own — nothing else in the app references "that address" by id — should
stay embedded inline rather than getting normalized out into a separate cache slot; give
it a `keyFields: false` policy (or just don't give it an `id` field in the schema) to
keep it that way.

## `typePolicies` and `fields`

A field policy is how the cache decides two things about one field: what makes two
calls to it "the same" (`keyArgs`), and how a new result combines with whatever's
already stored (`merge`).

```ts
new InMemoryCache({
  typePolicies: {
    Project: {
      fields: {
        tasks: {
          keyArgs: ['status'], // status splits the cache; page params don't
          merge(existing = [], incoming) {
            return [...existing, ...incoming];
          },
        },
      },
    },
  },
});
```

Leaving every argument in `keyArgs` (the default) means `tasks(offset: 0)` and
`tasks(offset: 10)` are treated as two *unrelated* fields with two unrelated cache slots
— "page 2" never appends to "page 1," it just overwrites its own slot each time offset
changes back. Excluding the pagination arguments from `keyArgs` collapses every page
onto one slot; `merge` is what decides how the incoming page combines with what's there.
`offsetLimitPagination()` and `relayStylePagination()` are Apollo's own helpers for the
two common shapes (offset/limit lists, and `edges`/`pageInfo` connections) — the
exercise has you write a small version of both by hand once, which is the point where
this stops being magic.

`fetchMore({ variables: { after: cursor } })` triggers the network call for the next
page; the `merge` function is what makes the result of that call combine with the
existing list instead of replacing it — `fetchMore` doesn't know or care how to combine
pages, that's entirely the field policy's job.

A `read` function is the read-side counterpart — computing a field's value from other
cached data instead of storing it directly (a derived `isOverdue` from a stored `dueAt`,
computed at read time so it's never stale relative to the clock).

## Cache updates after a mutation

Apollo automatically merges a mutation's response into the cache **by entity id** — if
`renameTask` returns `{ __typename: 'Task', id: '9', title: 'New title' }`, every query
result containing `Task:9` updates, no `update` function needed. That automatic path
only covers "update a field on an entity that's already in the cache." Two things it
doesn't do for you:

- **Creating** something (a new `Task` in a list) — nothing tells the cache which list
  to insert into. That's what a manual `update(cache, { data })` is for: read the
  current list with `cache.readQuery`, splice the new item in, `cache.writeQuery` it
  back. `cache.modify` is the lower-level tool for the same idea when you're patching a
  field in place rather than rewriting a whole query result.
- **Deleting** something — `cache.evict({ id: cache.identify(task) })` removes the
  entity's own record, but (same as this lesson's exercise) leaves dangling references
  in any list that had it; `cache.gc()` sweeps those. Skipping `gc()` after an `evict` is
  a common way to end up with a cache that *looks* consistent (the entity's fields are
  gone) but still renders an empty row where it used to be.

`refetchQueries` is the blunt instrument for either case — name the affected queries and
let a fresh network round trip reconcile everything. Correct, always, and the thing to
reach for under time pressure; a precise `update` is the thing to reach for once you know
exactly which cache write is needed and want to avoid the extra round trip.

## Optimistic UI

`optimisticResponse` applies a guessed result to the cache immediately, in an overlay
layer above the "real" cache state; `update` runs once against that guess (to route it
into whatever list it belongs in) and once again against the real response. If the
request fails, the overlay is rolled back — not "left as the guess," reverted to
whatever the cache held before. The realistic bug here isn't "forgetting to roll back"
(the library does that part); it's a *partial* rollback when the optimistic write
touched more than one place — an entity's own field, and a separate list it was spliced
into — and only one of the two is properly undone because they were written through
different paths. Compare this to `useOptimistic` (lesson 03): same idea — synchronous UI
guess, reconciled or discarded when the async result lands — but `useOptimistic` is
local component state with no cross-query fan-out; Apollo's version is a cache-wide
overlay specifically because the cache, not a component, is what's shared.

## Reactive variables and `@client` fields

A reactive variable (`makeVar(initialValue)`) is plain client-side state that lives
outside any component, readable and writable from anywhere, and — the reason it's part
of the cache API rather than just a module-level variable — a `@client` field in a query
can read it and the query re-renders when it changes, the same subscription machinery
normalized entities use. This is Apollo's answer to "but I still need some client-only
state, do I need Redux for that too" — a dark-mode flag, a selected-tab id, an
in-progress filter draft. Cache persistence (`apollo3-cache-persist` and similar) and
Apollo Client Devtools (inspecting the normalized store, replaying mutations) round out
the toolkit; skim these, they're not usually interview material.

## When something else fits better

TanStack Query (lesson 15) or a thin `fetch` + a document cache is the better default
when the API isn't GraphQL, or when the app doesn't need cross-query entity consistency
badly enough to justify normalization's complexity — a dashboard of mostly-independent
widgets, say. Within GraphQL, urql + `gql.tada` (lesson 79's comparison) trades some of
Apollo's built-in policy surface for a smaller bundle and TypeScript-first inference
without a codegen step; reach for it on a smaller app where Apollo's configuration
surface is more machinery than the app needs.

## Further reading (optional)

- [Apollo Client: typePolicies fields](https://www.apollographql.com/docs/react/pagination/core-api)
- [Apollo Client: cache.modify](https://www.apollographql.com/docs/react/caching/cache-interaction#cachemodify)
- [Apollo Client: reactive variables](https://www.apollographql.com/docs/react/local-state/reactive-variables)
- [Apollo Client: optimistic mutation results](https://www.apollographql.com/docs/react/performance/optimistic-ui)
