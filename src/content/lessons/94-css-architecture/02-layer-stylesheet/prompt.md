# Model the layered cascade

Implement two pure functions that a real build tool would use to assemble a layered
stylesheet, plus the specificity algorithm that underlies the whole cascade.

## `specificity(selector: string): [number, number, number]`

Return a `[ids, classesAndAttributesAndPseudoClasses, typesAndPseudoElements]` tuple per
the CSS specification:

- An id selector (`#foo`) counts toward the first number.
- A class (`.foo`), attribute selector (`[foo]`), or pseudo-class (`:hover`) counts toward
  the second number.
- A type selector (`div`) or pseudo-element (`::before`) counts toward the third number.
  The universal selector (`*`) and combinators (` `, `>`, `+`, `~`) count for nothing.
- `:where(...)` always contributes `[0, 0, 0]`, no matter what's inside it.
- `:is(...)`, `:not(...)`, and `:has(...)` contribute the specificity of their **single
  most specific argument** (compare tuples lexicographically — a-values first, then
  b-values, then c-values), not the sum of all arguments. Arguments can nest (a `:not()`
  inside a `:has()`, for example).

## `layerStylesheet(chunks, order?)`

```ts
type LayerName = 'reset' | 'base' | 'tokens' | 'components' | 'utilities' | 'overrides';
type LayerChunk = { layer: LayerName | null; css: string };
type LayerResult = { css: string; warnings: string[] };

function layerStylesheet(chunks: LayerChunk[], order?: LayerName[]): LayerResult;
```

Given an array of CSS chunks tagged with the layer they belong to, produce a single
stylesheet:

1. The output starts with a `@layer <order.join(', ')>;` statement declaring the layer
   order. `order` defaults to
   `['reset', 'base', 'tokens', 'components', 'utilities', 'overrides']`.
2. For each layer name in `order` that has at least one chunk, emit one
   `@layer <name> { ... }` block containing every chunk tagged with that layer, **merged
   in the order they appeared in the input array**. Skip layers with no chunks — don't
   emit an empty block.
3. A chunk with `layer: null` is legacy/unlayered CSS. Leave its `css` **outside** any
   `@layer` block in the output (appended after all the layer blocks), and push one entry
   onto the returned `warnings` array describing which chunk (by its index in the input
   array) was left unlayered.
4. Inside the `reset` and `base` layers only, rewrite every rule's selector list to zero
   specificity: split the selector list on top-level commas, and wrap each individual
   selector in `:where(...)` — **unless it already contains `:where(`**, in which case
   leave it untouched. Selectors in every other layer are left exactly as written. Each
   chunk you'll be given contains only flat rules (`selector { declarations }`, no
   nesting, no at-rules), so you don't need a full CSS parser for this step.

The `App` component renders the result of a sample call so you can see the generated
stylesheet in the preview.
