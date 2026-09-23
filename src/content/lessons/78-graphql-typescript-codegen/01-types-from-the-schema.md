# Types from the schema, not by hand

You already know the shape of a GraphQL schema from lesson 75: types, fields, nullability,
lists, enums, unions, interfaces. The moment you add TypeScript to a real client, a
question follows immediately: where do the `.ts` types for a query's result and its
variables come from? Hand-writing them is the wrong answer, for the same reason
hand-writing `.d.ts` files for a REST response is the wrong answer — the schema (or the
operation) is already a machine-readable contract, so generate from it and let a build
step keep the two in sync.

## GraphQL Code Generator: the default toolchain

[GraphQL Code Generator](https://the-guild.dev/graphql/codegen) (`@graphql-codegen/cli`) is
the toolchain most teams reach for. It reads your schema (SDL files, an introspection
JSON, or a live endpoint) and your operations (`.graphql` files or `gql` template
literals in your source), and writes TypeScript. Two outputs matter for a client app:

- **Server-side types** — one TypeScript type per object/input/enum/union in the schema,
  used to type resolvers (`Resolvers<Context>`). You write resolver logic against real
  types instead of `any`.
- **Client-side types** — one type per *operation*, not per schema type: `GetUserQuery`,
  `GetUserQueryVariables`. These are shaped by which fields the operation actually
  selects, not by the full object type. Select three fields on `User` and you get a type
  with exactly three fields — the rest of `User` doesn't leak in.

That second point is the thing beginners get wrong when they reach for the schema's own
generated `User` type to annotate a component prop. A component that received the result
of `{ id name }` should be typed by the *operation's* result type, not by the schema's
`User` type (which might have thirty fields) — otherwise you can't tell, from the type
alone, which fields were actually fetched.

## How codegen maps schema constructs to TypeScript

The mapping is mostly mechanical, but the mechanics matter for reading generated output:

- **Nullability.** A GraphQL type without `!` can return `null`. Classic `codegen`
  represents that as `Maybe<T>` — a generated alias for `T | null | undefined`
  (`undefined` covers variables you didn't pass) — unless you configure
  `maybeValue: T | null` to drop the `undefined`. `client-preset` (the modern, opinionated
  codegen setup covered below) defaults to plain `T | null`. Either way: a `!` in SDL
  means the generated field type has no null in its union; its absence means it does.
- **Lists.** `[Post!]!` becomes `Post[]`, non-nullable at both levels because both `!`s
  are present. `[Post]` becomes `Maybe<Maybe<Post>[]>` (or `(Post | null)[] | null`) — the
  list itself can be absent, and so can any element.
- **Scalars.** The five built-ins map to `string`/`number`/`boolean` obviously
  (`ID`/`String` → `string`, `Int`/`Float` → `number`, `Boolean` → `boolean`). Custom
  scalars (`DateTime`, `JSON`, `Upload`) have no built-in mapping — codegen emits
  `unknown` for them unless you supply a `scalars` config mapping each one to a concrete
  TS type, e.g. `{ DateTime: 'string', JSON: 'Record<string, unknown>' }`. This is a
  common footgun: an unmapped custom scalar silently becomes `unknown` everywhere it's
  used, and nobody notices until a build fails somewhere far from the schema file.
- **Enums.** Become TypeScript string-literal unions (`'ADMIN' | 'MEMBER'`) by default, or
  a real generated `enum` if you opt into that mode — string unions are usually preferable
  because they're structurally comparable and don't require importing a runtime value.
- **`__typename` and unions.** When an operation selects a union or interface field with
  inline fragments (`... on Post { title }`), codegen emits a **discriminated union**
  result type: one member type per concrete type in the selection, each carrying a literal
  `__typename: 'Post'` / `__typename: 'Comment'`. That's exactly the shape TypeScript's
  narrowing wants: `if (result.__typename === 'Post') { result.title }` type-checks
  because the literal `__typename` is the discriminant. This only works if `__typename` is
  actually requested — most codegen presets add it to every selection automatically for
  this reason, even if you didn't type it yourself.

## `TypedDocumentNode`: making the client infer from the query

Older setups generated a *string* for each query and a *separate* type for its result,
which you had to import and apply manually — nothing stopped you from pairing the wrong
type with the wrong query. `TypedDocumentNode<Result, Variables>` (from
`@graphql-typed-document-node/core`, and emitted by `client-preset` and by
`graphql-request`'s codegen mode) fixes this by attaching the result and variable types as
phantom type parameters on the document object itself. A client whose `useQuery` signature
is `useQuery<Result, Variables>(document: TypedDocumentNode<Result, Variables>)` — which
is how Apollo Client, urql, and TanStack Query's GraphQL integration all type it — infers
both type parameters from the document you pass, with no manual annotation:

```ts
const GetUserDocument: TypedDocumentNode<GetUserQuery, GetUserQueryVariables> = /* ... */;

const { data } = useQuery(GetUserDocument, { variables: { id: '1' } });
// data is GetUserQuery | undefined — no <GetUserQuery, GetUserQueryVariables> needed
```

The type and the query travel together in one value. Rename a field in the `.graphql`
file, rerun codegen, and `data.oldFieldName` becomes a compile error at every call site —
which is the actual point of this whole pipeline: **the compiler becomes your check that
the frontend didn't drift from the schema.**

## `client-preset`: colocation and fragment masking

`@graphql-codegen/client-preset` is the current recommended setup for new client apps (it
superseded the older `typescript`/`typescript-operations`/`typed-document-node`
plugin trio). Its defaults push two habits:

- **Colocated fragments.** Instead of one giant query per page, components each declare a
  `graphql(\`fragment UserCard_user on User { name avatar }\`)` next to their JSX, and a
  page-level query spreads those fragments in. This mirrors how components already own
  their own props.
- **Fragment masking.** A component that declares a fragment receives an *opaque* type for
  its data — not the plain object shape, but a branded type that only `useFragment()` (the
  codegen-generated one, not React's) can unwrap. This stops a parent from reaching into a
  child's fragment data directly (`user.avatar` fails to type-check on the masked type),
  which is what actually enforces colocation: a component's data dependencies stay
  encapsulated even though the wire response is one flat JSON object.

Run codegen in **watch mode** (`graphql-codegen --watch`) during development so generated
types update as you edit `.graphql` files, and run it once in CI to fail the build if
generation would produce a diff — catching a schema change that nobody regenerated for.

## The alternative: gql.tada

[gql.tada](https://gql-tada.0no.co/) takes a different approach: no generated `.ts` files
at all. It reads your schema (via an introspection JSON you point it at) and uses
TypeScript's own type system to infer a query's result and variable types *from the string
literal itself*, at the call site, live in your editor — powered by the
`@0no-co/graphqlsp` language service plugin, which also gives you inline diagnostics
(unknown field, wrong argument type) as you type the query, before you'd otherwise
discover it via `graphql-codegen`'s next run. `graphql-request` and most GraphQL clients
accept its documents as ordinary `TypedDocumentNode`s, so the client-side code looks
identical to the codegen version.

The trade-off is real: gql.tada leans on TypeScript's inference engine to do schema-shaped
work, which is slower for very large schemas and gives up the generated server-side
resolver types entirely (it's client-only). Teams with a large schema and a resolver layer
to type still reach for `graphql-codegen`; teams that want zero generated files and are
client-only increasingly reach for gql.tada. Both are legitimate default choices in 2026;
know which one a codebase uses before you go looking for a `generated/graphql.ts` file
that a gql.tada project doesn't have.

## Further reading (optional)

- [GraphQL Code Generator docs](https://the-guild.dev/graphql/codegen)
- [`client-preset` guide](https://the-guild.dev/graphql/codegen/docs/guides/react-vue)
- [gql.tada](https://gql-tada.0no.co/)
- [`TypedDocumentNode` RFC](https://github.com/dotansimha/graphql-typed-document-node)
