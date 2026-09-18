# The workflow around types

Generated types make the compiler catch drift between the frontend and the schema. That
only helps if the *schema itself* is a trustworthy, evolving artifact, and if the
generated documents are trustworthy in production too — not just in your editor. That's a
set of practices, not a single tool.

## Schema registries and breaking-change detection

A team with more than one service producing (or consuming) a schema needs somewhere the
schema *currently in production* lives, separate from whatever's in a feature branch.
[GraphQL Hive](https://the-guild.dev/graphql/hive) (open-source, from the same org as
`graphql-codegen`) and [Apollo GraphOS](https://www.apollographql.com/graphos) are the two
common registries: each subgraph or gateway publishes its schema on deploy, and the
registry becomes the source of truth codegen and other tooling point at instead of a
live endpoint or a checked-in SDL file that might be stale.

The registry's other job is **breaking-change detection in CI**: before a schema change
merges, diff it against the published, currently-live schema and fail the build if the
diff would break an *existing, observed* client query. `graphql-inspector` (standalone CLI,
also embeddable in Hive/GraphOS) does this diff and classifies changes as breaking,
dangerous, or safe:

- Breaking: removing a field or type, changing a field from nullable to non-nullable,
  removing an enum value, adding a required argument without a default.
- Dangerous: adding a value to an enum consumers might exhaustively `switch` over.
- Safe: adding an optional field, adding an argument with a default, adding a type.

Registries that track *which fields real clients actually query* (both Hive and GraphOS
do this via usage reporting) can tell you a "breaking" change is actually safe because no
client has queried that field in 90 days — turning the binary breaking/non-breaking
question into a real risk assessment.

## Deprecation instead of versioning

REST APIs version with a path segment or header (`/v2/users`) because there's no other way
to change a resource's shape safely. GraphQL's answer is **field-level, additive
evolution**: add a new field alongside the old one, mark the old one
`@deprecated(reason: "use fullName instead")`, and let clients migrate at their own pace
since each client only receives the fields it explicitly selects. Nothing forces a client
onto the new field the way a URL version bump forces a hard cutover. Codegen surfaces this
in the type layer too — some setups annotate deprecated fields with a TS `@deprecated`
JSDoc tag, so your editor strikes through `user.oldField` at every call site without
breaking the build. The schema registry closes the loop: usage reporting tells you when
the deprecated field's real-world traffic has actually dropped to zero, which is the
signal to remove it for real.

## Persisted documents: the production half of the DX loop

A GraphQL query in the client is normally sent as a big string in the POST body on every
request. That's flexible in development (any query, any shape) and a liability in
production: it's dead bytes wasted repeatedly on the wire, its arbitrary structure is a
harder target for a WAF or rate limiter to reason about than a fixed set, and it lets a
client send *any* query the schema allows — even one nobody reviewed.

**Persisted documents** (the current, more general name for what used to be called
persisted queries / automatic persisted queries, APQ) fix this by moving the query text out
of the request. At build time — as part of the same codegen run that generates your
types — every operation in your codebase gets hashed (or otherwise assigned an id) and
collected into a **manifest**: `{ [documentId]: normalizedQueryText }`. That manifest gets
deployed to the server as an allowlist. At runtime, the client sends only the id
(`client-preset`'s `persistedDocuments` option generates this automatically, replacing the
document text at each call site with just its `documentId`); the server looks the id up in
the manifest and executes the corresponding query text, rejecting anything not on the
list.

The payoff:

- **Security.** The server never executes arbitrary client-submitted query text in
  production — only queries that existed in a reviewed build. This closes off a class of
  abuse (deeply nested queries designed to cause resource exhaustion, or probing for
  fields that shouldn't be reachable) that schema-level authorization alone doesn't.
- **Bandwidth and caching.** A request identified by a short id is small and, sent as a
  GET with the id as a query parameter, is trivially cacheable by a CDN the way a REST GET
  is — recovering one of the ergonomic advantages REST had.
- **No behavior change for developers.** You still write and edit `.graphql` documents
  normally; the hashing and swap-to-id happen in the build, invisible day to day.

The classic APQ variant (Apollo's original design) has the client *try* the hash first and
fall back to sending the full query text with the hash if the server hasn't cached it yet
— a self-populating cache with no separate build step. The allowlist variant described
above is stricter (only pre-registered documents ever run) and is what most
security-conscious setups mean by "persisted documents" today.

## Mocking with generated types

Once you have a generated result type for an operation, a mock server or a component test
fixture can be checked against it. [MSW](https://mswjs.io/) handlers that return GraphQL
responses can import the operation's generated type and type the mock payload against it,
so a fixture that drifts from the schema (a renamed field, a field that's now nullable)
fails at the type level in the test file — before the test even runs, let alone before it
fails in CI against a real backend.

## The end-to-end loop

Put together, the daily loop looks like this: edit a `.graphql` document or a colocated
`graphql()` call → codegen (in watch mode) regenerates the operation's types → any
component reading the old shape fails to compile → fix the component → commit. In CI, a
second, independent check runs codegen with `--check` (fails if generation would produce
a diff, i.e. someone committed without regenerating) alongside the registry's
breaking-change check against the schema. Both gates exist because a schema change and an
operation change can each drift out of sync with what's actually generated, and the whole
value of this pipeline depends on the generated types being trustworthy at every commit,
not just on the day you set it up.

## Further reading

- [GraphQL Hive](https://the-guild.dev/graphql/hive)
- [`client-preset` persisted documents](https://the-guild.dev/graphql/codegen/plugins/presets/preset-client)
- [`graphql-inspector`](https://the-guild.dev/graphql/inspector)
- [Apollo: Automatic Persisted Queries](https://www.apollographql.com/docs/apollo-server/performance/apq)
