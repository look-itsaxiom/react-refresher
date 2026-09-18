Write `normalizeName` first and use it everywhere you match a name across the two sides:
`name.toLowerCase().replace(/[-_\s]+/g, '')`. Build a `Map` from normalized name to the original
object for `figma.components` and `code.components` so lookups are O(1) instead of re-scanning
arrays.

---

`missingInCode` and `missingInFigma` are the easy half: loop each side's components, look up the
normalized name in the other side's map, and push the *original* name when there's no match.

---

For `propMismatches`, only look at components that matched on both sides. Build a normalized-name
map of each side's properties/props the same way you did for components, then walk the Figma
side looking for a code match (`missing-in-code` when absent, `options-differ` when both are a
choice type and their option sets differ) and walk the code side looking for a Figma match
(`missing-in-figma` when absent).

---

"Choice type" only means Figma `'variant'` paired with code `'enum'` — a Figma `'text'` prop
paired with a code `'string'` prop is a fine match with nothing further to check. Compare option
sets with two lowercased `Set`s: same size and every element of one present in the other, order
and casing ignored.

---

For `normalizeColor`, a regex catches the short-hex case cleanly:
`/^#([0-9a-f])([0-9a-f])([0-9a-f])$/` against the lowercased, trimmed value — if it matches,
double each captured character to build the 6-digit form. Only compare `tokenDrift` for token
names present on **both** sides; a token missing entirely from one side isn't drift by this
function's contract.

---

`handoffChecklist` is a single `filter` + `map` over a fixed array of `[flagName, label]` pairs
in the order given in the prompt — no branching per flag needed:

```ts
const ORDER: Array<[keyof ComponentReadiness, string]> = [
  ['hasStoryForEachVariant', 'a story for every variant'],
  ['a11yChecked', 'a11y addon checked with no violations'],
  ['visualBaseline', 'a visual regression baseline approved'],
  ['figmaLinked', 'linked to its Figma component (Code Connect)'],
  ['docsDescription', 'a docs description for the component'],
];
```
