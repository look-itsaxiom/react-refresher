Start with `mergeField`. The match check needs "compatible," not "equal," type
conditions:
```ts
const match = target.find(
  (f) =>
    (f.alias ?? f.name) === (field.alias ?? field.name) &&
    (f.typeCondition === field.typeCondition || f.typeCondition === undefined || field.typeCondition === undefined),
);
```
If there's no match, `target.push(field)` and you're done for that call.
---
When there *is* a match, and the match's `typeCondition` is `undefined` while `field`'s
isn't, narrow it: `match.typeCondition = field.typeCondition`. Then, if both have a
`selectionSet`, don't overwrite the match's `selectionSet` — merge into it, field by
field: `for (const child of field.selectionSet) mergeField(match.selectionSet, child)`.
If either side lacks a `selectionSet` (a leaf), there's nothing more to do; the existing
match already covers it.
---
For `expandSelections`, handle the `'field'` branch first. If `selection.selectionSet`
exists, recurse with the *same* `typeCondition` and `fragmentPath` you were given — a
field's own children aren't a new fragment context. Check `.ok` on that recursive result
before using `.selectionSet`; propagate an error (`return nested;`) immediately if it
failed.
---
For `'fragmentSpread'`, the cycle check comes first: `if
(fragmentPath.includes(selection.name)) return { ok: false, error: ... }`. Then the
missing-fragment check. Only after both pass do you recurse into
`fragment.selectionSet`, passing `fragment.typeCondition` (not the caller's
`typeCondition` — that's the whole point of a fragment's type condition) and
`[...fragmentPath, selection.name]`.
---
For `'inlineFragment'`, skip the registry lookup and cycle check entirely — it isn't
named, so it can't create a cycle. The only difference from a fragment spread is the
type condition passed down: `selection.typeCondition ?? typeCondition` (fall back to the
enclosing one when the inline fragment has none).
---
Both `fragmentSpread` and `inlineFragment` end the same way: once you have the nested
`{ ok: true, selectionSet }`, don't just concatenate it onto your accumulator — call
`mergeField(result, field)` for each field in it, one at a time, so a field that also
appears elsewhere in the same selection set gets merged instead of duplicated.
