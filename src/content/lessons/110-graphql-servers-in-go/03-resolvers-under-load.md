# Resolvers under load: N+1, cost, and auth

A resolver that's correct in isolation can still be a liability in a tree. This concept is
about the three things that turn a working gqlgen schema into one that survives a real client:
the N+1 query pattern, cost/depth limits, and authorization that the store enforces, not just
the resolver.

## The N+1 problem, worked

Query `projects { tasks { assignee { name } } }` against 3 projects with 4 tasks each. Without
batching, a naive resolver tree issues:

- 1 query for `projects`
- 3 queries for `tasks` -- one per project, because each `Project.tasks` field resolver runs
  independently
- up to 12 queries for `assignee` -- one per task, same reason

That's **1 + N + M** queries for what should be three round trips: one for projects, one for
every task across every project, one for every user across every task. The GraphQL execution
model is exactly why this happens by default -- lesson 75 covered that sibling fields (and, at
any depth, their children) execute independently, which the spec deliberately leaves free to
run concurrently. Nothing in that model knows that twelve `Task.assignee` resolver calls are
about to ask for three overlapping sets of users; each one just does its job.

## Dataloader: batch within a request, cache per request

A **dataloader** breaks the assumption that a resolver call and a data-fetch call happen 1:1.
Instead, `Load(ctx, key)` returns a value (or, in JS dataloader implementations, a promise) but
doesn't immediately hit the database -- it registers the key and waits for a short window (an
event-loop tick in Node; an explicit collection window in Go, since there's no event loop to
hook into) during which every other `Load` call for the same loader adds its key to the same
group. When the window closes, one **batch function** runs once with every collected key and
returns a map keyed by that same set. Every pending `Load` call resolves from that one map.

Two guarantees make this safe to reuse across a resolver tree instead of hand-rolling caching
in every resolver: **the batch function's ordering contract** -- for a loader like
`UsersByIDs(ids []string) (map[string]User, error)`, callers don't need results back in a
particular order because the return is a map, not a slice (JS dataloader libraries that require
a positional array instead enforce "same length, same order as the input keys" as their
contract) -- and **the cache is per-loader-instance, not global**. A dataloader built fresh for
every incoming request (constructed in the same middleware that attaches a request ID or
principal to context, and stashed there the same way) means one request's cache can never leak
into another's -- critical, because two different users' resolved data must never collide. The
exercise you just built (or are about to) is exactly this: a generic `Loader[K, V]` that
collects concurrent `Load` calls into batches and caches results for its own lifetime, nothing
longer.

In the Go ecosystem, `github.com/vikstrous/dataloadgen` (generics-based, generated per-type) and
`github.com/graph-gophers/dataloader` (the older, `interface{}`-based version) are the common
off-the-shelf implementations gqlgen projects reach for instead of hand-rolling one --
mechanically the same shape you just built, wired into a per-request `Loaders` struct attached
to context by middleware. Check each library's current API before copying signatures verbatim;
the shape (`NewLoader(batchFn, opts...)`, a generated or generic `Load`/`LoadAll`) is stable
across versions, exact option names are not guaranteed to be.

## When batching still isn't enough: push it into SQL

A dataloader turns N+1 into 1+1+1 -- one query per *level* of the tree, not per node. That's
usually the right fix. But if `tasks` themselves have a filter or sort that varies per project
in a way the batch can't express uniformly, or the win of "one query for the whole level" still
isn't enough, the next move is pushing the batching *into* the query itself with
`WHERE id = ANY($1)` (lesson 108's "database side of N+1") and building the grouped result with
`json_agg` (lesson 107's jsonb coverage) so Postgres returns one row per project with its tasks
pre-aggregated -- collapsing what would
be a loader's batch-then-group step into the database. A dataloader's batch function calling
`WHERE project_id = ANY($1)` and grouping in Go, versus one query doing the grouping with
`json_agg` server-side, is a real tradeoff: the loader version is simpler Go and easier to
reason about; the SQL version is fewer round trips and less data crossing the wire when a
project has hundreds of tasks. Reach for the SQL version when profiling actually shows the
loader's grouping step as the bottleneck, not by default.

## Authorization: field-level and store-level, not either/or

gqlgen supports directive-based field authorization -- an `@auth(requires: ADMIN)` directive
declared in the schema and wired to a Go function in `gqlgen.yml`'s `directives` config, which
runs before the field resolver and can short-circuit with an error. That's the right layer for
"can this caller see this field at all" (a `salary` field only admins should resolve). It is
**not** a substitute for the store itself filtering by organization. A directive checks "is this
principal allowed to ask this question"; it says nothing about which rows the answer should be
scoped to. `TasksByProjectIDs` still needs `WHERE org_id = $1` (lesson 106's row-level tenancy
discipline) baked into the query, keyed off the principal pulled from context -- otherwise a
cross-org ID guess bypasses the schema entirely and reads someone else's data through a
perfectly "authorized" field. Directive-level auth answers "should this field resolve," store-
level auth answers "which rows can this query even see" -- an interview answer for "design the
GraphQL layer for cross-org project data" needs both, explicitly.

## Cost and depth limits: what a timeout can't catch

A `Timeout` middleware (lesson 103) bounds how long a request runs. It does nothing about a
*cheap-looking, expensive-to-execute* query -- `projects(first: 1000) { tasks(first: 1000) {
assignee { name } } }` is one small request body that, without a limit, resolves into up to a
million field executions. gqlgen's `extension.FixedComplexityLimit(n)` rejects any query whose
total complexity exceeds `n` before execution starts, where by default every field and level of
nesting counts as 1; a per-field `Complexity` function in `Config.Complexity` overrides that for
fields whose cost actually depends on an argument -- typically multiplying a list field's
children's complexity by its `first`/`limit` argument, exactly the `Cost` function you just
fixed in the exercise. This is a fundamentally different failure mode than a timeout: a timeout
catches a query that's slow *once it's running*; a complexity limit catches a query that would
be expensive *before it runs at all*, which matters because the expensive part might not be
latency -- it might be memory, or a downstream service getting hit a million times before
anything times out. Depth limits are the blunter, cheaper-to-compute cousin: reject anything
past N levels of nesting regardless of list sizes, catching pathological recursive queries
(`friend { friend { friend { ... } } }`) that a cost function alone might still price as
"acceptable."

## Pagination, persisted queries, and observability

**Pagination** for a list field follows the Relay connection spec covered in lesson 76 --
`edges`, `node`, `cursor`, `pageInfo { hasNextPage }` -- and matters here because it's the other
lever against runaway list sizes: `first: 20` bounds both the cost calculation above and the
actual rows a resolver has to touch, versus an unbounded `[Task!]!` that a client could, in
principle, ask to return everything. **Automatic persisted queries** cache large query
documents server-side behind a hash the client sends on subsequent requests (covered in the
previous concept) -- primarily a bandwidth optimization, though a fixed allow-list of persisted
hashes doubles as a security boundary in backend-for-frontend setups. **Observability**: the
Apollo tracing extension format (`extensions.tracing` in the response, per-resolver timing) is
still recognized by Apollo's tooling if you need drop-in compatibility with existing client-side
tracing dashboards, but OpenTelemetry instrumentation -- spans per resolver, propagated through
`ctx` the same way a principal or loader is -- is the more portable choice for a Go service
already using OTel for its HTTP layer, and gqlgen has middleware hooks (`graphql.OperationMiddleware`,
`graphql.FieldMiddleware`) built for wrapping exactly this kind of instrumentation around
execution without touching resolver bodies.

## Further reading (optional)

- [gqlgen — Complexity limits](https://gqlgen.com/reference/complexity/)
- [gqlgen — Directives](https://gqlgen.com/reference/directives/)
- [graphql.org — Best practices: pagination](https://graphql.org/learn/pagination/)
- [graphql.org — Best practices: authorization](https://graphql.org/learn/authorization/)
