Build a miniature version of the rule engine behind `axe-core`: a function that walks a rendered
tree and reports structural accessibility violations, the same category of thing `vitest-axe` or
`@axe-core/playwright` would flag.

Three helpers are already implemented for you in the starter — don't change them:

- `selectorFor(el: Element): string` — builds a CSS selector that resolves back to `el`.
- `isHidden(el: Element): boolean` — true if `el` has the `hidden` attribute, or `el` or any
  ancestor has `aria-hidden="true"`. (You built the ancestor-walking version of this idea in the
  `getByRoleLite` exercise; this is the same concept, reused.)
- `accessibleName(el: Element): string` — computes an element's accessible name, checking
  `aria-labelledby`, then `aria-label`, then a `<label for>` / wrapping `<label>`, then falling
  back to trimmed text content, in that order.

Implement and export:

```ts
type Violation = { rule: string; message: string; selector: string };
function auditA11y(root: HTMLElement): { violations: Violation[] };
```

Two rules are implemented for you as examples — `image-alt` and `duplicate-id` — showing two
different shapes of check (a simple per-element filter, and a check that groups elements by a
shared property). Implement the remaining seven, each scanning `root.querySelectorAll('*')` (or a
narrower selector) and skipping any element `isHidden` reports as hidden, **except** where noted:

- **`button-name`** — a non-hidden `<button>` or `[role="button"]` whose `accessibleName` is `''`.
- **`label`** — a non-hidden `<input>`, `<select>`, or `<textarea>` whose `accessibleName` is `''`.
- **`heading-order`** — walk non-hidden headings (`h1`–`h6`) in document order. Flag a heading if
  its level is more than one greater than the *previous non-hidden heading's* level. (The first
  heading is never flagged — there's no previous level to compare against.)
- **`link-name`** — a non-hidden `<a href="...">` (an `<a>` with no `href` isn't a link) whose
  `accessibleName` is `''`.
- **`aria-hidden-focus`** — a focusable element (`<button>`, `<a href>`, `<input>`, `<select>`,
  `<textarea>`, or anything with a `tabindex` of `0` or greater) that has `aria-hidden="true"` on
  *itself or an ancestor*. Unlike every other rule, this one only cares about elements that *are*
  hidden this way — don't skip them with `isHidden`, that would skip the very thing you're
  looking for.
- **`list`** — a non-hidden `<li>` whose direct parent is not a `<ul>` or `<ol>`.
- **`region`** — a non-hidden `<button>`, `<a href="...">`, `<input>`, `<select>`, `<textarea>`,
  or `[role="button"]` with no ancestor `<main>`, `<nav>`, `<header>`, `<footer>`, or `<aside>`.

For every violation, include a `message` that's specific enough to act on (name the rule's
concern, and for `duplicate-id` and `heading-order`, name the actual id or levels involved) and a
`selector` from `selectorFor(el)` pointing at the offending element.

The checks render a fixture (the default export, already provided — don't change it) that's
been built to trigger exactly one violation per rule, alongside several elements that look
similar but are correct and must **not** be flagged. A correct `auditA11y` finds all nine and
nothing else.
