There's no `graphql` package in this sandbox, which is the point: build the piece of a
GraphQL server that reads SDL text and turns it into a schema, against a small subset of
real SDL — enough to prove you understand what the type system actually encodes.

`App.tsx` gives you the types, a `parseTypeRef` helper, and regexes that find each kind
of top-level declaration (`scalar`, `enum`, `union`, `interface`, `type`, `input`) and a
`parseFieldBlock` helper that turns a `{ ... }` body into `FieldDef`s. Two functions are
left for you.

## 1. `parseSdl(sdl)`

Six regexes are provided, each already set up for `sdl.matchAll(...)`. For each one,
loop over its matches and add an entry to `types`:

- `SCALAR_RE` — match group 1 is the name. Add `{ kind: 'scalar', name }`.
- `ENUM_RE` — group 1 is the name, group 2 is the `{ ... }` body. Split the body on
  whitespace, drop empty strings, and add `{ kind: 'enum', name, values }`.
- `UNION_RE` — group 1 is the name, group 2 is the member list (`User | Post`). Split on
  `|` and trim each name, then add `{ kind: 'union', name, members }`.
- `INTERFACE_RE` — group 1 is the name, group 2 is the field block. Call
  `parseFieldBlock(group 2)` and add `{ kind: 'interface', name, fields }`.
- `TYPE_RE` — group 1 is the name, group 2 is the optional `implements A & B` list (or
  `undefined`), group 3 is the field block. Split group 2 on `&` and trim (or `[]` if
  there's no group 2), call `parseFieldBlock(group 3)`, and add
  `{ kind: 'object', name, implements, fields }`.
- `INPUT_RE` — same shape as `INTERFACE_RE`, but add `{ kind: 'input', name, fields }`.

Finally, return `{ types, query: 'Query', mutation: types['Mutation'] ? 'Mutation' :
undefined }`.

## 2. `validateSchema(schema)`

Return a `string[]` of human-readable problems. An empty array means the schema is
valid. Check, in this order:

1. If `schema.types['Query']` doesn't exist, push one error and return immediately —
   nothing else is worth checking without a root query type.
2. For every `object`, `interface`, and `input` type, for every field, and for every
   argument of every field: find the field/argument's named type with the given
   `namedTypeOf` helper (it unwraps `[...]` and `!`), and if that name isn't a key of
   `schema.types` **and** isn't one of the five built-ins (`ID`, `String`, `Int`,
   `Float`, `Boolean`), push an error naming the owning type, the field, and the unknown
   type name.
3. For every `object` type that declares `implements`, for every interface name it
   implements, for every field that interface declares: confirm the object has a field
   of the same name whose *named* type matches (compare with `namedTypeOf`, ignoring
   list/non-null wrapping). If the object is missing the field, or its named type
   doesn't match, push an error naming the object, the interface, and the field.
4. For every `union` type, for every member name: confirm `schema.types[member]` exists
   and has `kind === 'object'`. If not, push an error naming the union and the bad
   member.
