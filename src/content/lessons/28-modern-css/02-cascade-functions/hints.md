For `specificity`, handle the functional pseudo-classes (`:is()`, `:where()`, `:not()`, `:has()`)
first: find each one, pull out its parenthesized argument, and remove that whole
`:name(...)` chunk from the selector string before counting anything else. Otherwise you'll
double-count whatever's inside the parens as if it were a plain part of the selector.
---
To extract a functional pseudo-class's argument, scan forward from its opening `(` and track paren
depth so you find the *matching* closing `)` — arguments can themselves contain parens (e.g.
`:has(:not(.a))`). A naive `indexOf(')')` will cut the argument off too early.
---
`:where()` always contributes `[0, 0, 0]` — skip computing anything for its argument. For
`:is()`/`:not()`/`:has()`, split the argument on top-level commas (commas inside a *nested* paren
don't count as separators), compute `specificity()` recursively on each piece, and take the
component-wise max, not the sum.
---
For the remaining plain selector text, four independent regex passes are enough: `#[\w-]+` for IDs,
`\.[\w-]+` for classes, `\[[^\]]*\]` for attributes, `::[\w-]+` for pseudo-elements. Simple
pseudo-classes are a single `:` not immediately followed by another `:` or a `(` — a negative
lookbehind/lookahead pair handles that. Whatever letters are left over after stripping all of the
above are type selectors; `*` and combinators (` `, `>`, `+`, `~`) won't match that pattern, so they
correctly contribute nothing.
---
For `resolveCascade`, build the buckets in this exact order (lowest precedence first): normal
declarations per layer in `layerOrder`'s order, then normal unlayered, then important declarations
per layer in **reversed** `layerOrder`, then important unlayered. Whichever non-empty bucket comes
*last* in that list is the one that wins — scan from the end. Within a bucket, compare specificity
tuples lexicographically (`a` first, then `b`, then `c`), and break a tie by picking the higher
`order`.
