Start with `tsType`. It's the same two-case recursion as `parseTypeRef` in lesson 75, just
producing a string instead of parsing one: handle `ref.kind === 'named'` by looking up
`scalars[ref.name] ?? ref.name`, handle `ref.kind === 'list'` by recursing into `ref.of`
first and wrapping the result. Append `' | null'` at the very end of each branch, guarded
by `!ref.nonNull` — do this last, after the base type or array wrapping is already built,
so `(string | null)[]` (nullable items in a non-null list) and `string[] | null`
(non-null items in a nullable list) come out distinct.
---
For `generateTypes`, build a small array of `{ name, text }` objects as you iterate
`Object.values(schema.types)`, one per non-scalar type, then sort that array by `name`
and join the `text` fields with `'\n\n'` at the end — don't try to sort while iterating
the schema's own `Record`, since `Object.values` order there is declaration order, not
alphabetical.
---
A helper that renders a fields object into lines is worth factoring out, since
`interface`, `input`, and `object` all need "one `  name: type;` line per field, in
field-declaration order" — the only difference for `object` is the extra `__typename`
line prepended before that shared body.
---
Full shape for one object type, given `{ kind: 'object', name: 'Post', fields: { id: {...}, title: {...} } }`:

```ts
export interface Post {
  __typename: 'Post';
  id: string;
  title: string;
}
```

And the whole-file join: `blocks.sort((a, b) => a.name.localeCompare(b.name))` then
`blocks.map(b => b.text).join('\n\n') + '\n'` (a plain `<` / `>` comparison works just as
well as `localeCompare` for the ASCII type names these fixtures use).
