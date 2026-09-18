# Pagination, mutations, and errors

## Offset, cursor, and keyset pagination

Three shapes show up in GraphQL APIs, and they aren't interchangeable:

- **Offset** — `posts(skip: 20, take: 10)`. Trivial to implement on top of `LIMIT/OFFSET`
  SQL, and the only shape that supports "jump to page 7" directly. Breaks under
  concurrent writes: if a row is inserted before offset 20 while a client is paging,
  the next page shifts and either repeats or skips a row. Gets slower as the offset
  grows on most databases, since the engine still has to scan past the skipped rows.
- **Keyset** (a.k.a. seek pagination) — `posts(afterId: 42, take: 10)`, resolved as
  `WHERE id > 42 ORDER BY id LIMIT 10`. Stable under concurrent inserts (a new row
  can't shift what "after 42" means) and fast at any depth because the index seeks
  straight to the boundary instead of scanning. Can't jump to an arbitrary page — only
  "give me the next batch after this known position."
- **Cursor** — GraphQL's standard vocabulary for exposing a keyset-shaped API without
  committing to what the key actually is. The cursor is an **opaque** token the client
  round-trips verbatim; the server is free to encode a row id, a compound sort key, or
  anything else inside it, and to change that encoding later without breaking clients
  that never inspected it.

In practice, "cursor pagination" in a GraphQL schema *is* keyset pagination underneath,
wrapped in a client-agnostic token. The **Relay Cursor Connections spec** standardized
the shape so every client library — Relay, Apollo, urql — can page any connection the
same way without per-API custom code:

```graphql
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int
}

type PostEdge {
  cursor: String!
  node: Post!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type Query {
  posts(first: Int, after: String, last: Int, before: String): PostConnection!
}
```

`first`/`after` page forward; `last`/`before` page backward; a spec-compliant server
never accepts `first` and `last` in the same request. `node` is the actual object;
`edges` exists as a separate layer specifically to carry `cursor` per-item without
polluting the node type itself. `pageInfo.hasNextPage` is what a client checks before
requesting another page — not "did I get fewer than `first` results back," which is an
easy but wrong shortcut once server-side filtering can legitimately return a short page
that still has more after it.

**Infinite scroll** maps directly onto this: keep fetching `first: N, after:
pageInfo.endCursor` and append. **Paged UI** (page 1, 2, 3 with a number picker) is
usually easier to build on offset pagination, or on a keyset scheme that separately
exposes a page count — Relay connections don't do numbered pages well, since a cursor
doesn't correspond to a position.

## Mutation design: input objects, payload types, `userErrors`

The idiomatic shape, independent of any one client library:

```graphql
input CreatePostInput {
  title: String!
  body: String!
}

type CreatePostPayload {
  post: Post
  userErrors: [UserError!]!
}

type UserError {
  message: String!
  field: [String!]
}

type Mutation {
  createPost(input: CreatePostInput!): CreatePostPayload!
}
```

Three decisions repeat across every mature schema:

- **One `input` argument, not N scalar arguments.** Adding a field to `CreatePostInput`
  is non-breaking; adding a fourth positional-ish argument to `createPost(title: ...,
  body: ..., authorId: ...)` is the same shape problem REST has with query-string
  parameters that grow without bound.
- **A payload type, not the bare node.** `CreatePostPayload` wraps `post` alongside
  `userErrors`, so a validation failure ("title too long") doesn't have to be modeled as
  a GraphQL-level error at all — it's ordinary data in a successful response. This is
  the industry convention sometimes called **errors-as-data**: business-rule failures
  that the client is expected to display inline (a form field error) travel in `data`,
  not in the top-level `errors` array.
- **Return the affected node.** A client with a normalized cache (lesson 77) needs
  `post` back — with its `id` — to merge the new object into the cache and update every
  query that lists posts, without a manual refetch.

## Two error models, and when each applies

GraphQL's **top-level `errors` array** is for the other kind of failure — the request
itself broke, independent of business validation:

```json
{
  "data": { "user": null },
  "errors": [
    {
      "message": "User service timed out",
      "path": ["user"],
      "extensions": { "code": "UPSTREAM_TIMEOUT" }
    }
  ]
}
```

`path` says which field in the response the error came from (lesson 75's null-bubbling
covers how that interacts with `data`); `extensions.code` is where a machine-readable
error code lives — the spec deliberately leaves `extensions` schema-free so servers can
put whatever their clients need there, and most production APIs standardize a `code`
convention on top of it since `message` text is meant for humans, not `switch`
statements. A response can legally carry both `data` and `errors` at once — **partial
data** — which is the whole reason clients must check `errors` even when `data` isn't
null: one failed field among many successful ones is a normal, expected shape, not a
corrupted response.

The rule of thumb: **expected, user-facing failures** (bad input, a business rule, a
permission check with a message to show) go in a payload's `userErrors`, resolved
normally with no top-level `errors` entry. **Unexpected failures** (a downstream service
is down, an exception the resolver didn't anticipate) surface through the top-level
`errors` array, because there's no payload type to carry them. `@oneOf` input types
(lesson 75) push this even further for result shapes: a field can be typed to return a
union of a success type or a typed error object, forcing every client to handle both
branches at the type level instead of remembering to check an optional error field.

## `@defer` and `@stream`: useful, but not universal yet

`@defer` (mark part of a selection to arrive in a later, separate payload) and `@stream`
(deliver a list incrementally, item by item) address a real problem — a query that mixes
a fast field and a slow field currently waits for the slowest one before returning
anything. As of September 2026, both are still an accepted **RFC under active
development** in the graphql-spec repository, not part of the released base
specification: the request/response transport they need (multipart responses) isn't
settled in the same way query execution is. Support is real but partial and
implementation-specific — GraphQL.js and Apollo Server implement server-side execution
for both, Apollo Client and Relay have client support, and a schema using them is
betting on a specific client/server pairing rather than "any spec-compliant GraphQL
client." Treat them as an advanced, opt-in tool for a known client stack, not a default.

## Persisted queries and GET caching

A **persisted query** replaces the full query text in a request with a short hash the
server has already stored — the client sends `{ "id": "sha256:abc123...", "variables":
{...} }` instead of the query string. **Automatic Persisted Queries (APQ)** is the
common protocol for this: the client first tries the hash alone; on a cache miss the
server asks for the full query once, stores it against that hash, and every subsequent
request for that operation can use the hash. This shrinks request size and, more
importantly, lets an operator allow-list exactly which queries a client is permitted to
run in production — closing off the "anyone can send any query the schema allows" attack
surface that unrestricted GraphQL APIs otherwise have.

Persisted queries also unlock GraphQL over **HTTP GET**: a `query` operation (never a
`mutation`) can be sent as `GET /graphql?query=...&variables=...` — or, combined with
APQ, `GET /graphql?extensions={"persistedQuery":{"sha256Hash":"abc123"}}` — which is
what lets a CDN or the browser's own HTTP cache apply `Cache-Control` to a GraphQL
response the same way it would to any other cacheable GET request. POST remains the
default because query strings have length limits and because most GraphQL traffic is
mutations or queries not worth CDN-caching, but for a genuinely cacheable read, GET is
the only shape ordinary HTTP infrastructure understands.

## Further reading

- [Relay: Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- [GraphQL spec, September 2025 edition — §7 Response](https://spec.graphql.org/September2025/#sec-Response)
- [graphql.org: Pagination](https://graphql.org/learn/pagination/)
- [GraphQL over HTTP spec](https://graphql.github.io/graphql-over-http/draft/)
- [Apollo docs: Automatic Persisted Queries](https://www.apollographql.com/docs/apollo-server/performance/apq)
- [graphql-spec RFC: `@defer` and `@stream`](https://github.com/graphql/graphql-spec/blob/main/rfcs/DeferStream.md)
