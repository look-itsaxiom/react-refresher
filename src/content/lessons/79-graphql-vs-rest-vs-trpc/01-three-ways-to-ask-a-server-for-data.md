# Three ways to ask a server for data

You've now built a schema parser and a query executor by hand (lesson 75), so you know
what GraphQL actually costs to run. Before reaching for it on a new project, it's worth
being honest about what it buys you over the alternatives — because for a large share of
apps in 2026, the answer is "less than you'd think."

There are three shapes a client-server data API takes today. None of them is obsolete;
each wins in a different situation.

## REST: resources over HTTP semantics

REST models your API as **resources** (`/users/42`, `/users/42/posts`) and leans on HTTP
itself for meaning: `GET` is safe and cacheable, `POST`/`PUT`/`PATCH`/`DELETE` carry
intent, status codes report outcome, and `ETag`/`Cache-Control` headers let browsers,
CDNs, and proxies cache responses **without the server's cooperation on every request**.
A `GET /users/42` can sit in a CDN edge cache and serve a thousand clients without
touching your origin. A GraphQL `POST { user(id: 42) { name } }` cannot — same-shaped
request, same cache key, but the HTTP caching layer doesn't parse POST bodies.

REST's classic complaints are over-fetching (the list endpoint returns fields you don't
need) and under-fetching (rendering a page needs three round trips: user, then posts,
then comments). Both are real, and both are solvable without switching architectures:
sparse fieldsets (`?fields=id,name`), embedding (`?include=posts`), or a
backend-for-frontend that composes the calls server-side. OpenAPI 3.1 (aligned with JSON
Schema since 3.1) documents the contract, and generators like `openapi-fetch` and
`orval` turn that spec into a typed client — so "REST has no types" hasn't been true for
years. TypeSpec (Microsoft's API description language, compiling to OpenAPI) is gaining
ground in 2026 as a way to author that contract without hand-writing YAML.

## GraphQL: the client shapes the response

GraphQL flips the direction: the **client** writes a query describing exactly the shape
of data it wants, across whatever object graph the schema exposes, and the server
returns exactly that — nothing more, nothing less, in one round trip. One endpoint, one
schema, introspectable by tooling. This is a genuine win when a domain is graph-shaped
(users, posts, comments, likes, all cross-referencing) and multiple independent clients
— a web app, a mobile app, and a couple of internal dashboards — each want a different
slice of it. Each client evolves its own queries without asking the backend team for a
new endpoint.

The cost is real: a single query can trigger the N+1 problem (fetch 50 posts, then
naively fetch each post's author with a separate query — 51 round trips to your
database), it needs its own caching strategy since HTTP caching doesn't apply to POST,
and a schema this flexible needs active governance or it becomes a dumping ground for
every field anyone ever wanted. You'll fix N+1 and caching in the next concept step.

## tRPC and RPC-style APIs: types without a schema

The third shape skips describing the API altogether. **tRPC** (v11, 2025) lets a
frontend call a backend function as if it were a local one — `trpc.user.get.useQuery({
id: 42 })` — with the return type inferred directly from the server's TypeScript source,
no schema, no codegen step, no runtime validation library required (though most
projects add Zod at the router boundary for input validation anyway). It plugs directly
into TanStack Query for caching, retries, and invalidation, so you get the same
client-cache ergonomics GraphQL clients popularized, without a query language. The catch
is structural, not technical: it only works when the client and server share a
TypeScript project (a monorepo, or at least a shared package publishing the router
type), because the trick is importing the server's inferred types into the client's
build. A public API with an iOS team and a Java backend team can't consume tRPC's type
inference at all — there's no artifact to hand them.

tRPC isn't the only player here. **oRPC** and **ts-rest** aim at the same niche —
end-to-end TypeScript types — but generate an OpenAPI document as a byproduct, so a
tRPC-shaped API can still hand a contract to an outside consumer if needed. **Hono RPC**
does the same trick for teams already on the Hono server framework. And if you're inside
a React Server Components framework, **Server Functions** (lesson 22) are arguably a
fourth option that collapses the client/server boundary entirely: a `"use server"`
function called from a component *is* the RPC call, with no client library, no router,
and no separate type-sharing mechanism to set up — because it's one function, not two
ends of a wire protocol pretending to be one.

## A decision rubric, not a religion

- **Public API, unknown or many consumers, need documentation and stability guarantees**
  → REST + OpenAPI. This is still the default for anything crossing an org boundary.
- **Graph-shaped domain, several independent client teams, each wanting different
  slices** → GraphQL earns its operational cost.
- **One team, one TypeScript codebase (or a tight monorepo), internal tool or product**
  → tRPC or Server Functions. Skip the schema design and codegen tax entirely.
- **Read-heavy, cacheable at the CDN, mostly public content** → REST wins on caching
  alone; GraphQL's POST-only default fights you here (GET-based persisted queries help,
  see the next step).

State of JS 2025's survey data shows GraphQL usage holding roughly flat rather than
growing — satisfaction remains high among people who use it, but "would use again"
numbers have softened as tRPC and typed-REST tooling absorbed the internal-API use case
GraphQL used to be the default answer for. The honest 2026 read: GraphQL is a strong,
mature choice for its actual sweet spot (multi-client graph APIs, often public or
semi-public), not a general replacement for REST, and tRPC/Server Functions have taken
over the "just let me call my backend with types" job GraphQL was frequently drafted
into doing.

## Further reading (optional)

- [trpc.io — What is tRPC?](https://trpc.io/docs)
- [graphql.org — Introduction to GraphQL](https://graphql.org/learn/)
- [OpenAPI 3.1 specification](https://spec.openapis.org/oas/v3.1.0)
- [State of JS — GraphQL section](https://stateofjs.com/)
