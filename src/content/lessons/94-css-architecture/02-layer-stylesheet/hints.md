Start with `specificity`. Walk the selector string left to right with an index `i`,
switching on the current character: `#` → consume an identifier and add 1 to the first
number; `.` → consume an identifier and add 1 to the second; `[` → find the matching `]`
and add 1 to the second; whitespace/`>`/`+`/`~`/`*` → skip; a bare letter → consume an
identifier (a type selector) and add 1 to the third. Everything else is `:`.

---

For `:`, peek at the next character. `::` means a pseudo-element — consume the identifier
and add 1 to the third number. A single `:` means a pseudo-class — consume the identifier
first. If the identifier is followed by `(`, find the matching `)`; that's a functional
pseudo-class. `:where(...)` contributes nothing at all — just skip past it. `:is(...)`,
`:not(...)`, and `:has(...)` need you to split their contents on **top-level** commas
(commas not inside a nested `(` or `[`), recursively call `specificity` on each piece, and
add the lexicographically-largest resulting tuple to your running total. Any other
functional or plain pseudo-class (`:nth-child(2)`, `:hover`) just adds 1 to the second
number.

---

For `layerStylesheet`, first partition the input chunks into a `Map<LayerName, string[]>`
for layered chunks and a separate array for `null`-layer chunks (pushing a warning as you
go). Build the output layer-by-layer by iterating `order`, not by iterating the input
array — that's what makes chunks land in their declared layer order in the output
regardless of input order.

---

For the `:where()` rewrite, you don't need to parse full CSS. Each chunk is a sequence of
`selector-list { declarations }` blocks. Scan for `{`, treat everything before it (back to
the last `}` or start of string) as a selector list, split that on commas that aren't
inside brackets, and rebuild. A small helper like
`splitTopLevelSelectors(text: string): string[]` that tracks bracket depth while scanning
for `,` will do the job, and you can reuse it inside the `:is()`/`:not()`/`:has()` argument
splitting for `specificity` too.
