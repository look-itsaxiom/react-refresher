# Tables, lists, and text semantics

Landmarks and headings get a page's big shapes right. The rest of the accessibility tree comes
from smaller, more frequently botched choices: is this grid of numbers actually a `<table>`, is
this bulleted content actually a `<ul>`, is this a `<p>` or just a `<div>` that happens to have
text in it. None of these are exotic — they're the difference between a screen reader announcing
"table, 4 columns, 6 rows, Price, column header" and announcing nothing at all about a grid of
`<div>`s that merely looks like a table.

## Data tables: `<table>` earns its structure by being asked for it

A `<table>` isn't just a font choice — the accessibility tree computed from a `<table>` includes
cell coordinates, headers, and a name, all of which a screen reader user relies on to understand
what a given cell means without re-reading the whole row from the start. Get the pieces right:

```tsx
<table>
  <caption>Q3 pricing by plan</caption>
  <thead>
    <tr>
      <th scope="col">Plan</th>
      <th scope="col">Seats</th>
      <th scope="col">Price</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Starter</th>
      <td>5</td>
      <td>$29/mo</td>
    </tr>
    <tr>
      <th scope="row">Team</th>
      <td>20</td>
      <td>$99/mo</td>
    </tr>
  </tbody>
</table>
```

- **`<caption>`** gives the table its accessible name — announced before a screen reader user
  even enters the table, and what `getByRole('table', { name })` matches against in Testing
  Library. Don't substitute a `<h3>` sitting above the table; it's not programmatically
  associated with anything.
- **`<th scope="col">`** vs **`<th scope="row">`** tells the reader which axis a header applies
  to. Without `scope`, a `<th>` is still exposed as a `columnheader` by position (the first row
  gets it by default in most AT), but an explicit `scope` removes the guessing, and it's required
  the moment a table has header cells on *both* axes, like the row-header `Plan` column above.
- **Complex tables** — merged cells, multi-level headers, headers that don't sit in the first row
  or column — need explicit `headers="id id"` on each `<td>` pointing at the `id`s of every
  header cell that applies to it. `scope` alone can't express "this cell is described by two
  different header cells from different rows."
- **Never build a data table from `<div>`s with CSS grid.** It's the single most common table
  mistake: it looks identical, but produces zero table semantics — no cell count, no headers, no
  way to ask "what row am I in." If you need CSS grid's *layout* power for something that isn't
  tabular data (a settings form laid out in a grid), that's fine — CSS grid the layout mechanism
  and `<table>` the element are unrelated; just don't reach for grid-of-divs when the content
  really is rows and columns of related data.
- **Layout tables** — a `<table>` used purely for visual alignment with no real tabular data —
  are the mirror-image mistake, mostly a relic of 2005-era email templates now. If you're stuck
  maintaining one, `role="presentation"` strips its table semantics back out so a screen reader
  doesn't announce "table with 1 row" for what's actually just a layout container. Prefer fixing
  the layout with CSS in anything you're not just tolerating.

### Sortable headers: `aria-sort` on the header, a real button inside it

A sortable column needs the sort *state* on the `<th>` and the sort *action* on a focusable
control inside it — they're different concerns and both matter:

```tsx
<th scope="col" aria-sort={sortColumn === 'price' ? sortDirection : 'none'}>
  <button onClick={() => toggleSort('price')}>
    Price {sortColumn === 'price' && (sortDirection === 'ascending' ? '▲' : '▼')}
  </button>
</th>
```

`aria-sort` takes exactly one of `ascending`, `descending`, `none` (the default — omit the
attribute entirely rather than writing it), or `other` for a sort that isn't simply
alphabetical/numeric order. It goes on the header cell, not the button, and only one header in
the whole table should carry a non-`none` value at a time — moving it off the old column onto
the new one is part of implementing sort, not an afterthought. Put the actual click target on a
`<button>` inside the `<th>`, not `onClick` on the `<th>` itself: a `<th>` isn't natively
focusable or keyboard-activatable, so an unlabeled click handler on it is the same "looks
clickable, isn't focusable" bug as a `<div onClick>` from lesson 55.

Responsive tables that collapse to cards below some breakpoint are a CSS problem, not a markup
one — keep the real `<table>`/`<th>`/`<td>` structure and use CSS (`display: block` per row,
`::before { content: attr(data-label) }`, or a completely different visual treatment) rather
than swapping to a stack of `<div>`s at small widths and losing the semantics you just built.

## Lists: `<ul>`/`<ol>`, and the CSS reset that used to break them

`<ul>` and `<ol>` produce a `list` role with `listitem` children and an announced item count
("list, 4 items") — real information a screen reader user relies on to know how much content is
ahead of them. The classic footgun: `list-style: none` in a global CSS reset, applied to strip
bullet markers from a nav list, silently removed list semantics entirely in Safari for years
(the browser treated "no visible marker" as "not actually a list"). If you support a Safari
version where that's still true, or you're not sure, restore the semantics explicitly:

```css
ul.nav-list {
  list-style: none;
  /* Safari (pre-fix) drops list/listitem roles when list-style is none. */
}
```

```tsx
<ul className="nav-list" role="list">
  <li role="listitem">…</li>
</ul>
```

Adding `role="list"` (and `role="listitem"` on each `<li>` if you want to be thorough) re-asserts
the semantics that the CSS visually undid. It's a defensive habit worth keeping even as the
underlying bug gets fixed in shipping browsers, since you rarely control which browser version
your users are on.

`<dl>` is the right element whenever content is genuinely key-value pairs — a spec sheet, a
glossary, metadata rows — rather than a plain list:

```tsx
<dl>
  <dt>Released</dt>
  <dd>March 2026</dd>
  <dt>License</dt>
  <dd>MIT</dd>
</dl>
```

A row of `<div>`s with a bold label and a value next to it looks identical and conveys none of
"these are paired" to the accessibility tree; `<dl>`/`<dt>`/`<dd>` is the only way to say it
structurally.

## Small elements that carry real meaning

- **`<figure>`/`<figcaption>`** — pairs an image, diagram, or code sample with a caption that's
  programmatically associated with it, unlike a `<div>` and an adjacent `<p>` that merely sit
  near each other visually.
- **`<time datetime="2026-03-14">March 14, 2026</time>`** — the `datetime` attribute gives
  machine-readable ISO 8601 value while the visible text stays human-friendly; browsers and
  assistive tools that understand dates (and any script parsing the page) get the precise value
  regardless of how you chose to display it.
- **`<abbr title="Web Content Accessibility Guidelines">WCAG</abbr>`** — exposes the expansion to
  a screen reader on demand (and as a native tooltip for sighted mouse users) without cluttering
  the visible text with a spelled-out phrase every time.
- **`<blockquote cite="https://example.com/post">…</blockquote>`** — marks quoted content as
  quoted, which matters for a screen reader's "block quote" announcement, and `cite` records
  where it came from without stuffing the URL into visible text.
- **`<kbd>`** for a literal keystroke, **`<code>`** for a literal code token — both are
  inline-semantic elements a screen reader can be configured to announce distinctly (some verbosity
  settings announce "code" before code-formatted text), which a `<span className="code">` never
  triggers no matter how you style it.
- **`<p>` vs generic `<div>`/`<span>`** — a paragraph of prose is a `<p>`, full stop. It costs
  nothing and gains real structure (a screen reader can be told to navigate by paragraph); a
  `<div>` wrapping the same text is structurally silent.

## When the design system already ate all of this

Most teams don't write raw `<table>` or `<ul>` by hand forever — they end up behind a `<DataGrid>`
or `<List>` component from a design system, and the semantics above still apply, just one layer
removed. Two things to check before trusting a component:

1. **Does it render real elements underneath, or a `<div>` soup with visual styling only?** Open
   DevTools' Elements or Accessibility pane and look — a component library's marketing claims
   about "accessible by default" are not a substitute for checking.
   Headless libraries built specifically for this (Lesson 61's Radix, Base UI, React Aria) tend to
   get it right; a general-purpose UI kit chosen for its visual style might not.
2. **Does its API let you supply the specifics — `caption`, per-column `scope`, an accessible
   name for a landmark-like wrapper?** If a `<Table>` component only accepts `rows` and `columns`
   props with no way to set a caption or per-cell `scope`, you can't fix the semantics from the
   outside no matter how well you understand this lesson; that's a real constraint to raise with
   whoever owns the design system, not something to route around with `aria-label` band-aids on
   every table on the site.

## Further reading

- [`<table>` — MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table)
- [`aria-sort` — MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-sort)
- [Table with Sortable Columns — WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/table/)
- [`<dl>` — MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl)
