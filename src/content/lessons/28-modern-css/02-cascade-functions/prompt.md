Implement two pure functions that model how the cascade actually resolves a conflict, then let the
default `App` display a table of results so you can see them work.

## `specificity(selector: string): [number, number, number]`

Return the `[a, b, c]` specificity tuple for a selector drawn from this supported subset:

- `a` — ID selectors (`#foo`).
- `b` — class selectors (`.foo`), attribute selectors (`[foo="bar"]`), and simple pseudo-classes
  (`:hover`, `:focus`, `:nth-child(2)`, ...).
- `c` — type selectors (`div`, `a`, `img`, ...) and pseudo-elements written with a double colon
  (`::before`). The universal selector (`*`) and combinators (` `, `>`, `+`, `~`) contribute
  nothing.
- `:is(...)`, `:not(...)`, and `:has(...)` contribute the specificity of their **most specific**
  comma-separated argument — not their own token, and not the sum of all arguments.
- `:where(...)` always contributes `[0, 0, 0]`, regardless of what's inside it.

Legacy single-colon pseudo-elements (`:before`) are out of scope — always use `::before` in test
inputs.

Examples: `specificity('.card')` → `[0, 1, 0]`. `specificity('div.card#id')` → `[1, 1, 1]`.
`specificity(':has(img)')` → `[0, 0, 1]`. `specificity(':where(#a, .b)')` → `[0, 0, 0]`.
`specificity(':is(#a, .b)')` → `[1, 0, 0]`.

## `resolveCascade(declarations, layerOrder): CascadeDeclaration | null`

Given a list of `CascadeDeclaration` records (each with a `layer` — a name from `layerOrder`, or
`null` for unlayered — a `specificity` tuple, a source `order` number, and an `important` flag),
return the one declaration that wins, following the real algorithm:

1. Partition declarations into buckets, from **lowest** to **highest** precedence:
   normal-and-layered (in `layerOrder`'s order, earliest layer lowest), then normal-and-unlayered,
   then important-and-layered (in **reverse** `layerOrder`, so the *first* layer's `!important`
   beats a later layer's), then important-and-unlayered (highest of all).
2. Within the highest non-empty bucket, the declaration with the greatest specificity wins.
3. If specificity ties, the declaration with the greatest `order` (latest in source) wins.

Return `null` for an empty `declarations` array.

The starter's `App` renders a small table using both functions — you don't need to change it, but
look at it to see the shape of `CascadeDeclaration`.
