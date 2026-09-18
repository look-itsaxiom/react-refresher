Two pieces of a GraphQL engine, against the subset from the concept step: a single
anonymous or named `query`/`mutation` operation, nested selection sets, aliases, field
arguments (int/string/boolean/enum literals and `$variables`) — no fragments, that's
next lesson.

`App.tsx` already has `tokenize`, `parseValue`, `parseArgs`, and the operation-header
half of `parseQuery` fully written. Two functions are left.

## 1. `parseSelectionSet(tokens, start)`

`start` points at the first token *inside* a `{ ... }` body (the opening `{` was already
consumed by the caller). Loop while `tokens[i] !== '}'`, building one `FieldNode` per
iteration:

- **Alias.** If `tokens[i + 1] === ':'`, this field has an alias: `alias = tokens[i]`,
  `name = tokens[i + 2]`, advance `i` by 3. Otherwise `name = tokens[i]`, advance `i` by
  1, no alias.
- **Args.** If `tokens[i] === '('`, call `parseArgs(tokens, i)` — it returns `[args,
  nextIndex]` — and set `i` to `nextIndex`.
- **Nested selection.** If `tokens[i] === '{'`, recursively call
  `parseSelectionSet(tokens, i + 1)` — it returns `[nestedFields, nextIndex]` — and set
  `i` to `nextIndex`. This is the recursive case: `posts { id title }` nests exactly the
  same way the top-level `{ ... }` does.
- Push `{ name, alias, args, selectionSet }` (`args` defaults to `{}` when there were
  none; `selectionSet` stays `undefined` for a field with no nested `{ ... }`).

When the loop exits, `tokens[i] === '}'`; return `[fields, i + 1]` to consume it.

## 2. `completeValue` and `executeSelectionSet`

These two call each other recursively to walk a query against `resolvers`. Both have a
full docstring above their signature in `App.tsx` describing exactly what to do — the
short version:

- `executeSelectionSet` resolves each field in a selection set (a registered resolver,
  or a default property-read off the parent), then hands the raw result to
  `completeValue` to apply that field's declared `TypeRef`.
- `completeValue` enforces non-null (throwing a `NullBubble` when a non-null field gets
  `null`), maps over lists recursively, and — when the raw value needs more fields
  selected off it — recurses back into `executeSelectionSet`.
- Back in `executeSelectionSet`, a caught `NullBubble` either keeps propagating (the
  current field is itself non-null) or stops there (the current field is nullable, so
  it becomes `null` and its siblings are unaffected).

`execute()` at the bottom is already wired to call `executeSelectionSet` and catch a
`NullBubble` that escapes the very top, turning the whole `data` into `null`.
