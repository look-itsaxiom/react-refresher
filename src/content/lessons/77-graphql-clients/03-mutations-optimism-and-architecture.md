# Mutations, optimism, and client architecture

The cache mechanics from the last step exist to make one thing possible: a mutation
response — or a guess about what the response will be — updates every screen showing
that data, instantly, without each screen knowing about each other.

## What a mutation actually needs to update

A mutation response is itself a GraphQL result — normalize it exactly like a query
result, and `mergeEntities` does the rest: any component reading `User:1` re-renders
with the new name whether it queried for that user directly or through a fragment three
levels deep in an unrelated screen. The remaining work is the cases normalization alone
doesn't cover:

- **A field the mutation didn't return.** If `renameUser` responds with only
  `{ id, name }`, nothing updates `email`. Apollo's `update` function and
  `cache.modify`, or urql's `updates` map, exist for this: imperative code that runs
  after the mutation, given the cache and the response, to patch fields the response
  shape didn't carry.
- **A list that needs an insert or removal.** Creating a `Post` doesn't automatically
  make it appear in a `posts` list some other query cached — no entity *changed*, a new
  one appeared. `cache.modify` reading and rewriting the list's array of refs (Apollo),
  or an `updates.Mutation.createPost` function pushing the new ref into a cached list
  (urql Graphcache), or Relay's declarative `@appendNode`/`@prependNode` directives on
  the mutation, all solve the same problem: **someone has to say where the new node
  goes**, because "where" isn't information the mutation response carries on its own.
- **The blunt fallback: `refetchQueries`.** Naming specific queries to re-run after a
  mutation sidesteps writing cache-update logic entirely, at the cost of a network
  round trip you didn't need for data you could have derived locally.

## Optimistic updates

An **optimistic response** is a value shaped like the real mutation result, applied to
the cache *before* the request resolves, so the UI reflects the change with zero
perceived latency — then either reconciled with the real response (usually a no-op, if
your guess was right) or **rolled back** if the request fails. Mechanically this means
the cache needs to remember what an entity looked like before the optimistic write, so
failure can restore it — the normalized-cache exercise's `writeEntity`, called once
optimistically and (on failure) once more with the prior snapshot, is that same
primitive. Apollo and urql both build this in (`optimisticResponse`, and Graphcache's
`optimistic` resolvers); the failure mode to design for deliberately is a *partial*
optimistic write — updating one entity but forgetting a list it should also appear in —
which looks fine until the request fails and only some of the guess unwinds.

## Fetch policies and staleness

"Should this query hit the network, or is the cache good enough" is a per-query policy,
not a global switch:

- **`cache-first`** (the default in Apollo and effectively urql's default too): serve
  from cache if the data is there, network only on a miss. Fast, but can show stale data
  indefinitely if nothing ever invalidates it.
- **`cache-and-network`**: serve cached data immediately *and* fire a network request,
  updating the UI again when it resolves — the "stale-while-revalidate" pattern lesson
  15's mini `useQuery` implements for a document cache; Apollo exposes it as a named
  fetch policy for a normalized one.
- **`network-only`** / **`no-cache`**: always hit the network; the latter also skips
  writing the response into the cache, for data you deliberately don't want to
  normalize (a one-off report, sensitive data you don't want lingering).
- **`standby`**: don't fetch at all right now, but stay registered so a later
  `refetch()` or cache write still updates this query's result.

## Suspense, and the RSC-shaped split

React 19's Suspense-driven data fetching shows up in the GraphQL clients as a pair of
hooks, mirroring TanStack Query's `useSuspenseQuery`: **Apollo's `useSuspenseQuery`**
suspends the component until data is ready (simplest to write, but a naive tree of them
waterfalls); **`useBackgroundQuery` + `useReadQuery`** split "start the fetch" from
"suspend on the result" across two components, so a parent can kick off several queries
before any child suspends, avoiding the waterfall without manual `Promise.all`
choreography. urql ships the equivalent pair under its `@urql/exchange-suspense` client
options.

Where this meets Server Components: a query started (and normalized) on the server,
serialized, and hydrated into a client-side cache, so the client doesn't refetch what
the server already resolved. This is the newest, least settled part of the ecosystem —
Apollo's and urql's RSC integrations exist but are actively evolving, and Relay's
compiler-driven store predates RSC-native patterns by years, so its server integration
looks more like "fetch on the server, pass data down" than a shared cache spanning both.
Treat specifics here as directional, not something to copy verbatim without checking
current docs.

## Choosing among them in 2026

- **Apollo Client** if you want the most configurable normalized cache, the biggest
  ecosystem (dev tools, `@apollo/server` integration, subscriptions via `graphql-ws`),
  and are willing to write `keyArgs`/`merge` functions by hand.
- **urql** if you want normalization as an opt-in (start with the document cache,
  upgrade to Graphcache only where you actually need entity consistency), a smaller
  runtime, and exchange-based extensibility (auth, retry, persisted queries as
  composable exchanges rather than client-wide config).
- **Relay** if the team is willing to adopt the compiler and fragment-colocation
  discipline in exchange for masking, the strongest static guarantees about what data a
  component can see, and the best-proven pagination story (`@connection`) at large
  scale — Meta's own usage is the existence proof.
- **TanStack Query (or SWR) + a typed fetch**, per the last step, when your entities
  mostly live in one place on screen and you don't want to operate a normalized cache at
  all.

## Interview angle

Apollo Client is explicitly called out as a plus in the posting, and this is the lesson that shows you actually understand its cache, not just its hooks. A strong answer can trace what normalization gives you for free (renaming a task updates every screen showing that task, since they all read the same normalized entity) versus what still needs manual work: a new task doesn't appear in a cached task list on its own, because no entity changed, one was created, so `cache.modify` or an equivalent has to say where the new reference goes. Fetch policy choice is worth tying to the product directly: `cache-first` for your own team's data, `cache-and-network` for a dashboard where a vendor's status might have changed since you last looked, and `network-only` for anything you deliberately don't want stale, like a compliance-sensitive audit view.

**Likely follow-up:** You optimistically add a task to a program's task list on creation. The mutation fails. Walk through exactly what has to roll back, and what's different about rolling back a new list entry versus rolling back a changed field.

**Pitfall:** Writing an optimistic update that patches the entity but forgets the list it should also appear in, or vice versa, so the UI briefly shows an inconsistent state, like a task that exists if you navigate to it directly but is missing from the list, that only resolves once the real response lands. This is the "partial optimistic write" failure mode the lesson calls out by name.

## Further reading (optional)

- [Apollo Client — Mutations and cache updates](https://www.apollographql.com/docs/react/data/mutations/)
- [Apollo Client — Optimistic mutation results](https://www.apollographql.com/docs/react/performance/optimistic-mutation-results/)
- [urql — Graphcache updates and optimistic mutations](https://commerce.nearform.com/open-source/urql/docs/graphcache/cache-updates/)
- [Apollo Client — Suspense hooks (`useSuspenseQuery`, `useBackgroundQuery`)](https://www.apollographql.com/docs/react/data/suspense/)
