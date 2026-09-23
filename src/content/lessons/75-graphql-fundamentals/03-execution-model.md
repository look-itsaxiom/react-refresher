# How a query executes

A GraphQL request goes through three phases before anything touches your data:
**parse** the document text into an AST, **validate** that AST against the schema
(every field exists on its parent type, every argument is the right type, every
selection on an abstract type is legal), then **execute**. Only execution talks to
resolvers — parse and validate errors never reach a resolver at all, and they come back
as `errors` with no `data`.

## Resolvers and the default resolver

Execution walks the query's selection set field by field. For each field, the runtime
calls a **resolver** — a function with the signature `(parent, args, context, info)`:

- `parent` — the already-resolved value of the enclosing field (for a root field, this is
  the "root value" the server configured, often `{}`).
- `args` — the field's arguments, coerced to the types the schema declares.
- `context` — a per-request object (the authenticated user, a db connection, request
  headers) shared across every resolver in that request.
- `info` — schema and query metadata; used rarely, mostly for tracing.

Most fields don't need a resolver at all. If a type has no resolver registered for a
field, the **default resolver** just reads that property off `parent` — `User.name`
resolves to `parent.name`. You only write a resolver when the value isn't already
sitting on the parent: computing something, renaming a field, or — the common case —
fetching from a database or another service.

## Parallel queries, serial mutations

The spec requires **query** root fields (and any object field, at any depth) to execute
independently of their siblings — implementations are free to run them concurrently.
In a Node resolver this usually means "don't block on one field before starting the
next," realized with `Promise.all` under the hood rather than literal threads.

**Mutation** root fields are different: the spec requires the top-level mutation fields
to execute **serially**, in document order — the second mutation field doesn't start
until the first has fully resolved. If a client sends `mutation { a: createUser(...) b:
createUser(...) }`, `a` finishes completely before `b` begins. This exists because
mutations have side effects; running two writes concurrently that might depend on each
other's outcome is exactly the bug a serial guarantee prevents. Nested fields *inside*
a mutation's result follow the normal (parallel) rule again.

## Null propagation: a non-null field can still fail

Recall from the previous lesson that `String!` and `String` are different types. When a
resolver for a **non-null** field returns `null` (or throws), that failure doesn't just
null out that one field — it bubbles up to the nearest ancestor field that *is*
nullable, and nulls that instead, discarding everything the failed field's siblings and
subtree already computed at that level. If the failure reaches the root without finding
a nullable ancestor, the entire `data` value becomes `null`.

This is why schema design treats nullability as a reliability decision, not just a type
decision: a deeply-nested `!` chain means one flaky field can null out an entire branch
of the response, or the whole response. Making a field nullable is how you contain
blast radius.

Every field that failed — whether it bubbled or not — gets an entry in the response's
top-level `errors` array, and each entry carries a `path`: an array of field names and
list indices pinpointing exactly where the failure occurred (`["user", "posts", 2,
"title"]`). A response can legally contain **both** `data` (partial, with the failed
subtree nulled out) and `errors` in the same payload — that's the mechanism, not a bug.

## Subscriptions: the same schema, a different root

`subscription` is a third root operation type. Instead of returning one response, a
subscription field returns a value once per event on a stream, and each event is run
back through normal field execution against the schema — same resolvers, same null
propagation. The original transport, `subscriptions-transport-ws`, is unmaintained;
**graphql-ws** is the actively-maintained WebSocket protocol most servers and clients
target today, and **graphql-sse** offers a Server-Sent-Events-based alternative for
setups that would rather avoid WebSockets entirely.

## GraphQL over HTTP

The GraphQL-over-HTTP spec (still evolving, currently a working draft) formalizes what
implementations had already converged on: **POST** with a JSON body of `{ query,
variables, operationName }` is the general case; **GET** is legal for query operations
only (never mutations), with the same fields as query-string parameters, which makes
queries cacheable by ordinary HTTP infrastructure. The spec defines a dedicated response
media type, `application/graphql-response+json`, distinct from a server that just
returns `application/json`: a server advertising the new media type is expected to use
real HTTP status codes tied to the *request's* validity (400 for a malformed document,
for instance), whereas the older convention — still common — is "always return 200, put
everything in the body," because a request can be syntactically fine at the transport
level while still producing field-level `errors`.

## Where React fits, and where N+1 comes from

None of the above is React-specific — it's a wire protocol and an execution algorithm
that any client can speak. Apollo Client, urql, and Relay (lesson 77) exist because
caching a normalized graph of objects across many components is a genuinely hard
problem, not because GraphQL requires them; a component can `fetch()` a query and read
`{data, errors}` directly. On the server side, the resolver model above has an
infamous failure mode worth knowing the name of now: a `posts` resolver that fetches
each post's `author` with its own database call turns "get 20 posts" into 21 round
trips — the **N+1 problem**. The fix (batching per-request loads, most commonly with
DataLoader) and the fuller REST/GraphQL/tRPC tradeoff live in lesson 79.

## Interview angle

This is squarely what the posting means by "read and reason about a resolver." Expect to be handed a schema like `Task { id, title, assignee: User, dependencies: [Task!]!, vendor: Vendor }` and asked to trace execution: which fields need a real resolver versus falling through to the default resolver reading a property off `parent`, and what happens when `vendor` is nullable but `dependencies` isn't. A strong answer explains null propagation concretely: if a `Task.vendor` resolver throws, only `vendor` nulls out, because it's nullable; if a non-null field like `dependencies` fails, the failure bubbles to the nearest nullable ancestor, which could null out the entire task depending on how the schema was shaped, so a deeply non-null schema around cross-company data, like a vendor lookup that might legitimately fail, is a reliability decision, not just a type decision.

**Likely follow-up:** A `Program` type has a non-null `tasks: [Task!]!` field, and one task's `vendor` resolver throws because the vendor's system timed out. What does the client actually receive back, and would you design the schema differently knowing vendor lookups can fail?

**Pitfall:** Treating every field as needing a hand-written resolver, or not accounting for how aggressive non-null usage around data you don't control, like a vendor integration or a partner API, turns one flaky dependency into a nulled-out response far bigger than the field that actually failed.

## Further reading (optional)

- [GraphQL spec, September 2025 edition — §6 Execution](https://spec.graphql.org/September2025/#sec-Execution)
- [graphql.org: Execution](https://graphql.org/learn/execution/)
- [GraphQL over HTTP spec](https://graphql.github.io/graphql-over-http/)
- [graphql-ws](https://github.com/enisdenjo/graphql-ws) and [graphql-sse](https://github.com/enisdenjo/graphql-sse)
