# Operations that scale with the schema

A schema (lesson 75) is a contract the server owns. An **operation** — a `query` or
`mutation` document — is something every client, and often every component, writes
independently against that contract. The schema growing to hundreds of types doesn't
make any one operation harder to read, as long as the operation itself is disciplined
about naming, variables, and fragments. That discipline is what this lesson teaches.

## Name every operation, always pass variables

```graphql
query GetUserProfile($userId: ID!) {
  user(id: $userId) {
    id
    name
    email
  }
}
```

Two habits that look optional but aren't:

- **Name the operation** (`GetUserProfile`, not an anonymous `query { ... }`). Every
  client dev-tool — Apollo DevTools, browser network tab, server access logs, APM traces
  — groups requests by operation name. An app full of anonymous queries is unreadable in
  production; naming costs nothing at write time.
- **Never inline a value that came from user input or component props.** `user(id:
  "42")` looks fine in a demo and is a cache-poisoning, injection-adjacent habit in
  production — it also means the server can't safely cache-key or persist the query
  (more on persisted queries in the next lesson-half). `$userId: ID!` is the same
  argument, parameterized, and the client library serializes it safely.

Variable definitions carry their own nullability rule, independent of the schema field
they'll be used against: `$userId: ID!` must be provided; `$limit: Int = 10` is optional
and defaults to `10` if the caller omits it; `$limit: Int` (no `!`, no default) is
optional and resolves to `null` if omitted — which is only safe if the field on the
other end treats `null` the same as "no argument given." Getting this wrong is a common
bug: a variable typed `Int` instead of `Int!` silently lets `null` flow into an argument
the schema never expected to be absent.

## Fragments are the unit of data requirements, not just DRY

A **fragment** names a reusable selection on a type:

```graphql
fragment UserCard on User {
  id
  name
  avatarUrl
}

query GetUsers {
  users {
    ...UserCard
    email
  }
}
```

Read as "avoid repeating `id name avatarUrl`," a fragment is a minor convenience. Read as
"the data a `<UserCard>` component needs, expressed once, next to that component," it's
the mechanism that makes GraphQL clients scale past a handful of screens. This is
**colocation**: a `UserCard.tsx` file exports both the component and the fragment its
JSX renders, and the *parent* query simply spreads it in without knowing what's inside.
When `UserCard` grows a new field, the fragment changes in one file and every query that
spreads it picks up the new requirement automatically — no hunting through query strings
scattered across the app.

Apollo Client and Relay both take this further with **fragment masking**: a component
that declares `fragment UserCard on User { ... }` only receives, at the type level, the
fields *that fragment* selected — not the full `User` object the parent's broader query
also fetched. This is enforced by the generated types (lesson 78), not by anything at
runtime; the point is that a component can never accidentally depend on a field another
component happened to fetch nearby, which is exactly the coupling colocation is trying to
prevent. The practical debate this settles — "one big query per screen" vs. "a fragment
per component, composed upward" — was won by the fragment-per-component side for any
app with more than a few reusable components: Relay has enforced it from day one, Apollo
Client added first-class masked-fragment support, and even teams on a thin custom client
tend to reinvent some form of it by hand once a query string gets past a few hundred
lines.

## Inline fragments answer "which concrete type is this?"

Fragments spread on a concrete type (`fragment UserCard on User`) are the common case.
An **inline fragment** with a type condition is how a selection handles a field typed as
an interface or union, where the concrete type varies per response object:

```graphql
query Search($term: String!) {
  search(term: $term) {
    __typename
    ... on User {
      name
    }
    ... on Post {
      title
      author {
        name
      }
    }
  }
}
```

Only the branch matching the object's runtime `__typename` applies; the other branch's
fields simply aren't present on that response object. A named fragment can carry a type
condition too (`fragment PostSummary on Post { title }`) and gets spread the same way
inline fragments do — the two forms differ only in whether the selection has a name you
can reuse elsewhere.

## Directives change what's selected, per-request

`@include(if: Boolean)` and `@skip(if: Boolean)` are the two directives every client
implements, and they're the mechanism for conditional selection without maintaining two
separate query strings:

```graphql
query GetUser($userId: ID!, $withEmail: Boolean!) {
  user(id: $userId) {
    id
    name
    email @include(if: $withEmail)
  }
}
```

`if` can take a variable (the common case, decided per-request) or a literal boolean
(rare — if it's always `true`, delete the directive; if it's always `false`, delete the
field). Both directives are valid on a field, a fragment spread, or an inline fragment,
and the selection they annotate is dropped from the document entirely when the condition
resolves against it — as opposed to being fetched and then hidden client-side. When both
land on the same selection, `@skip` wins: `@skip(if: true) @include(if: true)` skips.

## Aliases let you select the same field twice

```graphql
query CompareUsers($a: ID!, $b: ID!) {
  first: user(id: $a) {
    name
  }
  second: user(id: $b) {
    name
  }
}
```

Without `first:`/`second:` as aliases, both selections would try to write to the same
`user` response key and the second would silently overwrite the first in most client
normalization layers. An alias is also how you select the same field twice with
*different arguments* at all — `user(id: $a)` and `user(id: $b)` are only distinguishable
in the response by their alias.

## Fragments are also how you avoid over-fetching

The most common GraphQL anti-pattern is a single query at the top of a page that
selects every field every descendant component might conceivably want, "just in case."
It defeats the entire point of a query language — the server does more work, the
response is bigger, and half the fields are dead weight for most renders of that screen.
Fragment colocation fixes this structurally: a component's fragment only lists what that
component renders, so a query built by composing fragments upward can't over-fetch
without some component itself asking for more than it uses — a code-review-visible
problem, not an invisible one.

## Further reading (optional)

- [GraphQL spec, September 2025 edition — §2.8 Fragments](https://spec.graphql.org/September2025/#sec-Language.Fragments)
- [GraphQL spec — §2.10 Variables](https://spec.graphql.org/September2025/#sec-Language.Variables)
- [graphql.org: Fragments](https://graphql.org/learn/queries/#fragments)
- [Relay docs: Thinking in GraphQL (fragment colocation)](https://relay.dev/docs/principles-and-architecture/thinking-in-graphql/)
