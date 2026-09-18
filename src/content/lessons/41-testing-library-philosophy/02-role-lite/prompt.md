The checks that grade every exercise in this course are written with real Testing Library queries
— `screen.getByRole`, `within(...).getByRole`, and so on. This exercise asks you to build a
miniature version of that machinery yourself, so the next time `getByRole` "just works" you know
exactly what it's doing.

Implement and export a function:

```ts
function getByRoleLite(
  container: HTMLElement,
  role: string,
  options?: { name?: string | RegExp; level?: number },
): HTMLElement
```

It should resolve roles the same way the real `getByRole` does, for this subset of HTML:

- **Implicit roles**: `<button>` → `button`, `<a href="...">` → `link` (an `<a>` with no `href`
  has no link role), `<h1>`–`<h6>` → `heading` (each carrying a `level` equal to its number),
  `<input>` → `textbox` by default or with `type="text"`, `checkbox` for `type="checkbox"`,
  `radio` for `type="radio"`, `<select>` → `combobox`, `<ul>`/`<ol>` → `list`, `<li>` →
  `listitem`, `<nav>` → `navigation`, `<main>` → `main`, `<dialog>` → `dialog`.
- **Explicit override**: an element's `role="..."` attribute wins over whatever its tag would
  imply — a plain `<div role="button">` is a button, full stop.
- **Hidden exclusion**: an element with a `hidden` attribute, or `aria-hidden="true"` on itself
  *or an ancestor*, is invisible to the query by default — the same way it's invisible to
  assistive tech.
- **Accessible name**, computed in this order and stopping at the first match: `aria-labelledby`
  (joined text of the referenced elements) → `aria-label` → a `<label for="...">` pointing at the
  element's `id`, or a `<label>` the element is nested inside → the element's own text content.
- When `options.name` is given, only elements whose computed name matches (exact string, or
  `RegExp.test`) count as matches. When `options.level` is given, only headings at that level
  count.
- **Throw** a helpful `Error` when there are zero matches, and a different helpful `Error` when
  there's more than one — the same shape of failure `getByRole` gives you, so a caller knows to
  add a `name` to disambiguate.

You don't need to handle every HTML element or ARIA option that real Testing Library supports —
just the ones listed above. The checks render a fixture (already provided as the default export,
don't change it) and call your function against the same container real
`within(container).getByRole` would use, so a correct implementation has to agree with the real
thing, not just pass by coincidence.
