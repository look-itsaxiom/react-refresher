# A type system with a query language on top

GraphQL is two things bolted together: a schema definition language (SDL) that describes
every type, field, and argument a service exposes, and a query language clients use to
ask for exactly the shape of data they want back. The type system is the part that
actually does the work — validation, tooling, codegen, and introspection all read the
schema, not the queries. The current spec is the **September 2025 edition**
(spec.graphql.org publishes a newer working draft dated September 2026, but September
2025 is the released edition implementations target).

## The type kinds

SDL has eight kinds of type. Five are built-in scalars — `Int`, `Float`, `String`,
`Boolean`, `ID` (a string that's serialized as a string but semantically an opaque
identifier) — plus:

```graphql
scalar DateTime           # a custom scalar; the server defines parse/serialize
                           # logic for it, SDL only declares the name

enum Role {
  ADMIN
  MEMBER
}

interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  name: String!
  email: String
  role: Role!
  posts(limit: Int): [Post!]!
}

type Post implements Node {
  id: ID!
  title: String!
  author: User!
  publishedAt: DateTime
  status: PostStatus! @deprecated(reason: "use `state` instead")
}

union SearchResult = User | Post

input UserFilter {
  role: Role
  nameContains: String
}
```

`type` is an **object type** — the only kind that can appear as a concrete result in a
response. `interface` and `union` are abstract: a field typed as an interface or union
resolves to *some* concrete object type at runtime, and a client asks which one with
`__typename`:

```graphql
query {
  search(term: "react") {
    __typename
    ... on User { name }
    ... on Post { title }
  }
}
```

(`... on Type` is a fragment — full treatment in the next lesson. For now, know that
`__typename` is how a client, and a resolver, tells union members and interface
implementers apart.) An object implementing an interface must declare every field the
interface declares, with a covariant-compatible type — this is a validation rule the
schema itself enforces before any query runs.

## Nullability and lists are part of the type, not an afterthought

`String` and `String!` are different types. Every field, argument, and input field is
nullable **unless** it's suffixed with `!`. This is the opposite default from most
typed languages, and it's deliberate: GraphQL assumes any field can fail (a downstream
service times out, a permission check fails) and wants that failure representable
without crashing the whole response — more on this in the next lesson.

Lists compose with nullability independently at each level. Reading `[String!]!` from
the outside in:

- outer `!` — the list itself is never `null`; the field always returns at least `[]`.
- `String!` inside — no element of that list is ever `null`.

So `[String!]!` can be `[]` or `["a", "b"]` but never `null` or `["a", null]`. Compare to
`[String]` (list can be `null`, and each element can independently be `null`) and
`[String!]` (list can be `null`, elements can't). Reading and writing these correctly is
worth the extra second — getting it backwards is one of the most common schema-design
mistakes, and it's very hard to change after clients depend on it.

## Input types are a separate namespace from output types

A type is either **input** (usable as an argument or input-object field: scalars, enums,
and `input` types) or **output** (usable as a field's return type: scalars, enums,
`type`, `interface`, `union`). An `input UserFilter { ... }` can only ever be used where
an argument is expected — you cannot return an `input` type from a field, and you cannot
use an `interface` or `union` as an argument type. This split exists because inputs need
a closed, fully-specified shape the server can validate and coerce before execution
starts; outputs are resolved lazily, field by field, and abstract types defer "which
concrete shape is this" until a resolver actually produces a value.

One SDL feature closes a longstanding gap here: `@oneOf` on an `input` type, finalized in
the September 2025 edition. It marks an input as a tagged union — exactly one of its
fields must be provided, and it must be non-null:

```graphql
input CreatePaymentInput @oneOf {
  card: CardInput
  bankTransfer: BankTransferInput
}
```

Before `@oneOf`, modeling "provide the card details *or* the bank transfer details, never
both, never neither" meant either two mutations or a loosely-validated input with a
runtime check — now the schema enforces it.

## Fields are arguments-first, like small functions

Every field can take arguments, not just root query fields: `posts(limit: Int): [Post!]!`
above lets a client page a nested list the same way it would page a top-level one. This
is the detail that most distinguishes GraphQL from a REST resource graph — there's no
separate "endpoint" for "give me the first 5 posts by this user"; it's the same `posts`
field, called with different arguments, at whatever depth it's nested.

## The schema is the contract, and introspection is how tools read it

Everything above — types, fields, arguments, deprecations — is queryable at runtime
through **introspection**: `__schema`, `__type(name: "User")`, and `__typename` are
meta-fields every spec-compliant server exposes for free. GraphiQL, codegen (lesson 78),
and IDE autocomplete all work by introspecting a live schema instead of reading source.
That same introspection surface is why production services often restrict or disable it:
it hands out your entire internal data model, including deprecated-but-not-yet-removed
fields, to anyone who asks. Locking it down (allow-list a persisted set of known
operations, or gate introspection behind auth) is a standard hardening step, covered
alongside depth/complexity limiting in lesson 79.

## Further reading (optional)

- [GraphQL spec, September 2025 edition](https://spec.graphql.org/September2025/) — §3
  (Type System) has the authoritative grammar for everything above.
- [graphql.org: Schemas and Types](https://graphql.org/learn/schema/)
- [graphql.org: Introspection](https://graphql.org/learn/introspection/)
- [RFC: OneOf Input Objects](https://github.com/graphql/graphql-spec/blob/main/rfcs/OneOfInputObjects.md)
