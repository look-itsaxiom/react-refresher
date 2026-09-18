Implement the client half of codegen — the part that types one *operation* — plus the
persisted-documents workflow from the second concept step.

`App.tsx` gives you the schema and operation-AST types, plus `typeRefToTs` (the same
nullability/list recursion from the schema-codegen exercise, generalized so the base type
at a `named` leaf comes from a `leaf` callback instead of a fixed scalar lookup). Four
functions are left for you.

## 1. `renderFieldType(fieldNode, typeName, schema, scalars)`

Look up the field's `TypeRef` from `schema.types[typeName].fields[fieldNode.name].type`,
then call `typeRefToTs(ref, leaf)`, where `leaf(name)`:

- If `schema.types[name]` is a `union` and `fieldNode.inlineFragments` is set: render each
  fragment with `renderObjectFields(fragment.selectionSet, fragment.onType, schema,
  scalars)` and join the results with `' | '` — a discriminated union, one member per
  requested concrete type.
- Else if `schema.types[name]` is an `object` and `fieldNode.selectionSet` is set: return
  `renderObjectFields(fieldNode.selectionSet, name, schema, scalars)`.
- Else (a scalar or enum leaf, no further selection possible): return `scalars[name] ??
  name`.

## 2. `renderObjectFields(selectionSet, typeName, schema, scalars)`

Return `{ __typename: 'TypeName'; key: Type; ... }`: always start with a literal
`__typename: 'TypeName';`, then for every field in `selectionSet` (skipping an explicit
`__typename` selection, since it's already covered), emit `responseKey:
renderFieldType(field, typeName, schema, scalars);` where `responseKey` is `field.alias ??
field.name`, in selection order. Join every piece with a single space, wrapped in `{ }`.

## 3. `generateOperationTypes(document, schema, name, scalars)`

Produce:

```ts
export type ${name}Variables = { varName: Type; ... };

export type ${name}Query = { __typename: '...'; ... };
```

`Variables` comes from `document.variableDefs` (each entry rendered with `typeRefToTs`
against the scalar map directly — variables are never object selections); use `{}` when
there are none. `Query`'s root type is `schema.query` for a `'query'` operation, or
`schema.mutation ?? 'Mutation'` for a `'mutation'` operation; render it with
`renderObjectFields(document.selectionSet, rootType, schema, scalars)`. End the result
with a trailing newline.

## 4. `persistedDocumentId(documentText)` and `buildManifest(documents)`

`persistedDocumentId` hashes the UTF-8 bytes of `documentText` with `crypto.subtle.digest`
(`'SHA-256'`) and returns the lowercase hex digest (each byte as two hex characters,
zero-padded, concatenated in order).

`buildManifest` takes a map of arbitrary keys to raw document text and returns the
persisted-documents allowlist: for each document, normalize its whitespace (already done
for you by `normalizeDocument`, which collapses runs of whitespace to a single space and
trims), hash the *normalized* text, and record `manifest[id] = normalizedText`. The
original keys of `documents` don't appear in the output — only the computed ids do.
