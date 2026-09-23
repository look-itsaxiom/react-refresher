# Operating GraphQL safely at scale

If you do pick GraphQL, it doesn't run itself safely. A schema that lets clients compose
arbitrary queries is also a schema that lets an attacker (or an honest client with a
bug) compose an arbitrarily expensive one. Everything below is what "production
GraphQL" means beyond the executor you already built.

## N+1 and DataLoader

Recall your resolver model from lesson 75: `User.posts` is a resolver that runs once
**per parent object**. Query 50 users, each selecting `posts`, and a naive resolver
issues 50 separate `SELECT * FROM posts WHERE author_id = ?` calls — the N+1 problem,
except it's graph-shaped so it's really N+1 per level of nesting.

The fix is **batching**: instead of each resolver hitting the database immediately,
each `load(key)` call registers its key and returns a promise, and a scheduler flushes
all keys registered within the same tick into **one** call — `batchFn([1, 2, 3, ...,
50])` — then fans the single result back out to each waiting promise. This is the
`DataLoader` pattern (originally a Facebook library, now the standard shape reimplemented
across every GraphQL server runtime). Two properties make it work:

1. **Batching per tick.** Resolvers for sibling fields all run before any of them
   awaits, so if each one calls `load()` synchronously, all the keys land in the same
   queue before the microtask that dispatches `batchFn` gets a turn to run.
2. **Per-request caching.** A loader instance is created **per request**, not shared
   globally — so the same `load(1)` called from two different resolvers within one
   request returns the same in-flight promise instead of triggering a second fetch, but
   a `User` fetched in one request doesn't leak stale data into the next one's cache.

You'll build this exact pattern in the next exercise.

## Query complexity, depth limits, and the cost spec

A batched resolver still runs — it's just efficient per level. Nothing stops a client
from asking for `user { posts { comments { author { posts { comments { ... } } } } } }`
nested 20 levels deep, or requesting a list field with `first: 100000`. Two independent
defenses:

- **Depth limiting**: reject a query above N levels of nesting outright. Cheap, blunt,
  catches recursive-schema abuse (a `User` with `friends: [User!]!` is the classic case).
- **Cost/complexity analysis**: assign every field a cost, multiply by the size
  requested for list fields (`first`/`limit` arguments, or a static estimate if the
  client can't be trusted to report it honestly), sum recursively, and reject queries
  above a budget *before execution starts* — you compute this from the parsed query
  document and the schema, without touching the database. The `@cost` and `@listSize`
  schema directives (from the GraphQL working group's cost-directives proposal) let a
  schema author declare per-field cost and how a list field's size argument should be
  read, so the same static analysis works across any compliant server, not just one
  vendor's library.

Rate-limiting by **cost** rather than by request count matters specifically because
GraphQL requests are not uniform: one request can be a single scalar field, another can
be a five-level nested fan-out. A per-IP "100 requests/minute" limit does nothing to
stop the second kind.

## Aliases, batching, and introspection abuse

Two attacks that look benign in isolation:

- **Alias abuse**: `{ a: expensiveField b: expensiveField c: expensiveField ... }`
  repeated hundreds of times in one request. Depth limiting doesn't catch this — it's
  flat, not deep. Cost analysis does, because each alias is a separate selection and
  each one adds its field's cost again (you'll see this directly in the next exercise).
- **Batching abuse**: sending an array of 500 operations in a single HTTP request
  (`[{query: "..."}]`), a feature some server/client combinations support, turning one
  connection into 500 units of work the rate limiter never sees as 500 requests.

**Introspection** (`__schema`, `__type`) is invaluable in development — it's what
GraphiQL, Apollo Sandbox, and codegen tools use to know your schema's shape — but it
hands the same map to an attacker in production. Standard practice by 2026: disable
introspection outside dev/staging, and pair it with **persisted queries** — the client
registers a fixed set of query documents (by hash) ahead of time, and production only
accepts a `queryId` referencing one of them, never arbitrary query text. This closes
the door on ad-hoc malicious queries entirely, at the cost of a deploy step to register
new operations. It also happens to solve GraphQL's HTTP-caching gap: a persisted query
requested by ID over `GET` is just as cacheable as a REST resource URL.

Error responses need the same discipline as REST: don't let a resolver's stack trace or
raw database error leak into the `errors` array a client can see — mask internal errors
behind a generic message, log the real one server-side.

## Federation and schema governance

At scale, one team doesn't own the whole schema. **Apollo Federation 2** (and
comparable approaches — GraphQL Hive/Mesh, Cosmo) lets separate teams each publish a
**subgraph** — its own schema for the types it owns — and a **router/gateway** composes
them into one graph the client sees as a single endpoint. A `Product` type owned by the
catalog team and a `Review` type owned by the reviews team can each reference the other
via `@key` (declaring which fields identify an entity across subgraphs) without either
team's service calling the other directly; the router resolves cross-subgraph references
by generating internal fetches through the same batching machinery.

This solves the org-scaling problem GraphQL has at 50+ engineers, but it adds its own
governance surface: a schema registry that validates a subgraph's changes won't break
the composed graph before deploy, and per-resolver tracing (federation's router emits
spans per subgraph fetch) so a slow field is traceable to the team that owns it, not just
"the graph is slow."

## Migration paths

You rarely start a GraphQL project from zero data. **GraphQL Mesh** and similar adapters
let you stand up a GraphQL layer *in front of* an existing REST or gRPC backend,
translating queries into calls against the APIs you already have — useful as an interim
step, or permanently, if the value is the unified client-facing graph and not a
GraphQL-native backend. The reverse also happens: exposing a REST-shaped subset of a
GraphQL backend for a partner who can't or won't adopt GraphQL.

## Further reading (optional)

- [graphql.org — DataLoader pattern](https://github.com/graphql/dataloader)
- [GraphQL WG — Cost Directives RFC (`@cost`/`@listSize`)](https://github.com/graphql/graphql-wg/blob/main/rfcs/Cost-Directives.md)
- [Apollo Federation 2 documentation](https://www.apollographql.com/docs/federation/)
- [OWASP GraphQL Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html)
