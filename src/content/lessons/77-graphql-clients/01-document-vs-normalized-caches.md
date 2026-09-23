# Document caches vs normalized caches

Lesson 75 and 76 covered the wire format: SDL, execution, fragments, pagination shapes.
This lesson is about what happens to the response *after* it lands in the browser — the
part where Apollo Client, urql, and Relay actually differ from each other, and from just
using TanStack Query with `fetch`.

## The problem a normalized cache solves

Say two components each run a query that both select `user(id: "1") { name }`, one
nested inside a post's author, the other standalone. A **document cache** — what
TanStack Query, SWR, or a hand-rolled `useQuery` gives you (see lesson 15's mini
`useQuery`, which cached exactly this way) — keys its cache by the *operation*: a hash
of the query text plus variables. Each of those two queries gets its own cache entry.
If a mutation changes that user's name, nothing about the document cache knows the two
entries share an underlying entity. You either refetch both queries, or you manually
patch both cache entries with matching logic, or the UI shows the same user with two
different names until something revalidates.

A **normalized cache** keys by *entity identity* instead of by operation. Every object
in a response that looks like an entity — has a `__typename` and an `id` (or whatever
your key fields are) — gets flattened into one shared record, addressed by something
like `User:1`. Every place a query selected that user, in any operation, becomes a
pointer to the same record. Update `User:1` once — from a mutation response, a
subscription push, or a manual write — and every query result built from it is
consistent, without re-running any of them. This is the mechanic you'll build by hand in
the next exercise: `normalize()` flattens a response into entities-plus-refs,
`denormalize()` walks refs back into a full result, and `writeEntity()` lets one write
fan out to everywhere that entity is displayed.

## Apollo Client's `InMemoryCache`

Apollo's cache identifies an object by calling `typePolicies[__typename].keyFields`, or
falling back to `id`/`_id`. The resulting key, `Typename:id`, is exactly the ref scheme
above. Two mechanisms make this useful beyond the naive version:

- **`keyArgs`** on a field's type policy tells the cache which arguments are part of its
  *identity* versus which are just pagination/filtering noise. A field like
  `posts(offset: Int, limit: Int)` with `keyArgs: false` collapses every call to
  `posts` (regardless of `offset`/`limit`) onto one cache slot, so a custom **`merge`**
  function can concatenate pages into one growing list — the standard Apollo
  infinite-scroll pattern. Get `keyArgs` wrong (e.g. leaving `offset` in the key) and
  every page becomes its own cache entry instead of one growing list.
- **`cache.modify`** and **`cache.updateQuery`** let a mutation's `update` function
  reach into the cache and edit fields on an entity, or splice an item into a list,
  without refetching. `cache.evict` removes an entity (or a field) and, combined with
  `cache.gc()`, reclaims memory for objects nothing references anymore.

The cost of all this: every entity needs a stable identity, `merge` functions for
paginated fields are hand-written and easy to get subtly wrong, and a query that can't
resolve every field from cache falls back to `partial: true` data or a network request,
which surprises people expecting an all-or-nothing cache hit.

## urql: exchanges, and two different caches

urql's request pipeline is a chain of **exchanges** — middleware functions the operation
passes through (dedup, cache, retry, fetch). Swapping the caching exchange changes the
caching *model* entirely:

- The default `cacheExchange` is a **document cache**: same idea as TanStack Query, keyed
  by operation, with one addition — it tracks which entity `__typename`s appeared in each
  response, so it can invalidate (not intelligently update, just drop) every cached
  document that mentioned a typename a mutation just touched. Simple, but coarse: a
  `Post` mutation invalidates every cached query that touched any `Post`, even unrelated
  ones.
- `@urql/exchange-graphcache` replaces it with a real **normalized cache** — entity keys,
  custom `resolvers` for redirecting a lookup to an existing entity (e.g. serve
  `todo(id: "1")` from a `Todo:1` already in the cache from a list query, no request),
  and `updates` functions for patching entities and lists after a mutation, playing the
  same role as Apollo's `update`/`cache.modify`.

The architectural difference from Apollo isn't the end state (both can normalize) — it's
that normalization is opt-in middleware in urql, versus the only mode `InMemoryCache`
has.

## Relay: the compiler does the identity work for you

Relay normalizes too, but you don't write `keyFields` or `keyArgs` — the **Relay
compiler** processes your `graphql\`...\`` tagged fragments at build time, generates
matching query/fragment artifacts, and the runtime store normalizes using the schema's
declared `id` field (via a `Node` interface convention) automatically. Two things follow
from that:

- **Fragment masking.** A component that spreads `...PostCard_post` in its query can only
  read the fields *that fragment itself* declared, even though the full query fetched
  more. This stops the common cache bug where component A happens to work because
  component B, elsewhere in the tree, coincidentally fetched the field A forgot to ask
  for — Relay's type system won't let A read a field it didn't select.
- **The `@connection` directive** tags a paginated field so the store maintains it as one
  growing, mutation-aware list keyed by its arguments — the same problem Apollo solves
  with `keyArgs`/`merge`, but declared once in the query rather than configured in
  client setup.

The tradeoff is upfront cost: no compiler step, no Relay. Every query is statically
known at build time (no dynamic query construction), which is also how it gets some of
the best bundle-splitting and typing of the three.

## When a document cache is enough

If your app's entities rarely appear in more than one query at a time, or your UI
already re-renders top-down from one source of truth per screen, a normalized cache is
solving a consistency problem you don't have — at the cost of identity requirements
(every type needs a stable key), harder-to-reason-about partial data, and real memory
overhead for a cache that keeps every entity you've ever seen until something evicts it.
**TanStack Query (or SWR) plus a thin GraphQL fetch** — `graphql-request`, or a raw
`fetch` with a JSON body — gives you the request/response/mutation lifecycle (retries,
staleness, background refetch, request dedup) without ever normalizing. Lesson 78 covers
pairing that with typed documents via codegen. Plenty of production apps use exactly
this combination and never touch Apollo, urql, or Relay.

## Further reading (optional)

- [Apollo Client — Type policies and normalization](https://www.apollographql.com/docs/react/caching/cache-configuration/)
- [Apollo Client — Cache field behavior (`keyArgs`, `merge`)](https://www.apollographql.com/docs/react/pagination/core-api/)
- [urql — Normalized caching with Graphcache](https://commerce.nearform.com/open-source/urql/docs/graphcache/normalized-caching/)
- [Relay — Thinking in Relay (fragments, masking, connections)](https://relay.dev/docs/principles-and-architecture/thinking-in-relay/)
