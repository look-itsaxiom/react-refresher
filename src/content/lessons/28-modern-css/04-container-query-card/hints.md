`container-type: inline-size` goes on `.card-grid` itself — that's the element whose size the
`@container` rule below will query. It doesn't matter which selector queries it, only that some
ancestor is opted in.
---
`@container (min-width: 28rem) { .card-grid { grid-template-columns: repeat(2, 1fr); } }` — the
declaration inside can target `.card-grid` or `.card`, whichever you want to change; the check only
looks for an `@container` block containing a `grid-template-columns` change, not which selector it's
attached to.
---
`.card:has(img)` reads naturally as "a `.card` that contains an `<img>` anywhere inside it." Put any
declaration you like inside it — the check just confirms the selector and a rule body exist.
---
The layer order statement is just `@layer reset, components;` on its own line, with no `{ }` block
— that's the full statement, not a layer definition.
