Implement the core of a schema-to-TypeScript codegen pass: given a parsed schema (the same
shape lesson 75 built with `parseSdl`, trimmed down to what type generation needs) and a
scalar map, produce the `.ts` source text you'd normally find in `generated/graphql.ts`.

## 1. `tsType(ref, scalars)`

Render one `TypeRef` as a TypeScript type string:

- A `named` ref resolves its `name` through `scalars` (falling back to the bare name for
  a schema-defined type — an object, interface, input, enum, or union), then appends
  `| null` unless `nonNull` is true.
- A `list` ref renders its `of` type recursively, wraps it as an array (`Type[]`,
  parenthesizing first if the item type itself contains a `|`, e.g. `(string | null)[]`),
  then appends `| null` unless the list's own `nonNull` is true.

## 2. `generateTypes(schema, scalars)`

Walk every type in `schema.types` and build one declaration per type, skipping `scalar`
types entirely (they only ever appear via `scalars`, never as their own declaration):

- `enum` → `export type Name = 'A' | 'B';`, values in schema order.
- `union` → `export type Name = Member1 | Member2;`, members in schema order — just the
  member names, since each is already emitted as an object type with its own
  `__typename`.
- `interface` and `input` → `export interface Name {` then one line per field, in schema
  order, `  fieldName: tsType(fieldDef.type, scalars);`, then a closing `}`.
- `object` → the same shape as `interface`/`input`, but with `__typename: 'Name';` as the
  **first** line inside the braces, before the schema's own fields. Every object gets
  this, not just union members — that's what makes a later selection on a union field
  narrowable by `__typename`.

Join the declarations with a single blank line between them, **sorted by type name**
(ascending, plain string comparison — not schema-declaration order), and end the result
with a trailing newline.

You will not need `eval` or `new Function` anywhere — this is pure string building over
data you already have.
