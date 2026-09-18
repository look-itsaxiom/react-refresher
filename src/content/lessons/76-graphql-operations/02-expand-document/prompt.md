Extend the AST from lesson 75's `parseQuery`/`execute` with three things a real client
has to resolve before a query can even be sent to `execute`: fragment spreads, inline
fragments with type conditions, and `@include`/`@skip` directives. Implement
`expandDocument(doc, options)`, which flattens all of that into a plain selection tree —
the shape `execute` already knows how to walk.

`App.tsx` has every type defined and two small helpers fully written
(`resolveArgs`, `isSkipped`). Two functions are left, both exported so the checks can
call `expandDocument` directly:

## 1. `mergeField(target, field)`

Mutates `target: ExpandedField[]` in place, adding `field` to it. A **match** is an
existing entry in `target` with the same `(alias ?? name)` whose `typeCondition` is
**compatible** with `field`'s: either they're equal, or *either one* is `undefined`.
`undefined` means "selected with no type condition, so it applies no matter what
concrete type this ends up being" — which is exactly what a field selected directly,
outside any fragment, means, and it's compatible with the same field also arriving
through a fragment on some concrete type. Two *different, both-defined* type conditions
(the two branches of a union, say) are **not** compatible — those are mutually exclusive
runtime possibilities and must stay separate entries, even though they'd collide by name
alone.

- If no match exists, push `field` onto `target`.
- If a match exists and the match's `typeCondition` is `undefined` while `field`'s isn't,
  narrow the match: set `match.typeCondition = field.typeCondition`.
- If a match exists and **both** the match and `field` have a `selectionSet`, merge
  every entry of `field.selectionSet` into the match's `selectionSet` by calling
  `mergeField` again, recursively, for each one.

## 2. `expandSelections(selections, variables, fragments, typeCondition, fragmentPath)`

Walks one selection list into a flat, merged `ExpandedField[]`, or an error.
`typeCondition` is what the *caller* is nested under (`undefined` at the very top of the
operation); `fragmentPath` is the list of fragment names currently being expanded, so a
cycle can be caught instead of recursing forever.

For each selection, first check `isSkipped(selection.directives, variables)` — if
`true`, drop it and move to the next one. Otherwise, branch on `selection.kind`:

- **`'field'`** — build an `ExpandedField` (`name`, `alias`, `args:
  resolveArgs(selection.args, variables)`, `typeCondition`), recursing into
  `selection.selectionSet` with the *same* `typeCondition` and `fragmentPath` if it's
  present, then `mergeField` the result into the accumulator.
- **`'fragmentSpread'`** — if `fragmentPath` already contains `selection.name`, that's a
  cycle: return an error. If `fragments?.[selection.name]` doesn't exist, that's an
  unknown fragment: return an error. Otherwise recurse into the fragment's own
  `selectionSet`, with `typeCondition` set to *the fragment's* type condition and
  `fragmentPath` extended by the fragment's name, then merge every resulting field into
  the accumulator.
- **`'inlineFragment'`** — same recursive shape as a fragment spread, but the type
  condition is `selection.typeCondition ?? typeCondition` (no registry lookup, no cycle
  check — an inline fragment isn't named).

Any error returned by a recursive call should propagate immediately rather than being
swallowed.

`expandDocument` itself is already wired: it resolves `doc.variableDefinitions` against
the variables you pass in (missing a required one is an error) and then calls
`expandSelections` with the resolved variables.
