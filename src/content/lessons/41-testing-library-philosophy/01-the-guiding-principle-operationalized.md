## The one rule, and the mechanics behind it

Testing Library's guiding principle is a single sentence: "the more your tests resemble the way
your software is used, the more confidence they can give you." By September 2026 that sentence has
been the industry default for long enough that it's worth treating less as a slogan and more as an
engineering constraint — one with a specific, checkable mechanism behind it: **queries model
perception, not implementation.**

Every `*ByRole`, `*ByLabelText`, and `*ByText` query is really asking "what would a user (including
one using a screen reader, switch device, or browser extension) find here?" That's not a metaphor.
`getByRole` walks the same accessibility tree a screen reader consumes, computed by
[`dom-accessibility-api`](https://github.com/eps1lon/dom-accessibility-api) under the hood. A
component that fails `getByRole('button', { name: 'Submit' })` in a test very often fails for a
real assistive-technology user too — the query is a proxy for an audit, not just test plumbing.

### The query priority list, and why it's ordered this way

Testing Library's docs publish an explicit
[priority order](https://testing-library.com/docs/queries/about/#priority), and it isn't
arbitrary — it's sorted by how available each signal is to a user who *isn't* looking at your
source:

1. **`getByRole`** — role and accessible name. Every interactive element has a role, so this
   covers the most ground and forces you to keep markup semantic.
2. **`getByLabelText`** — for form fields, the label *is* the interface; a sighted mouse user and
   a screen-reader user both rely on it.
3. **`getByPlaceholderText`** — weaker, since placeholder text disappears once a field has a
   value and isn't a substitute for a real label.
4. **`getByText`** — fine for non-interactive content (a paragraph, a status message).
5. **`getByDisplayValue`** — the current value of a form element, useful for asserting an input
   was filled correctly.
6. **`getByAltText`** — images, areas, inputs — anything `alt` applies to.
7. **`getByTitle`** — `title` isn't reliably read by assistive tech and isn't visible without a
   hover, so it's a last resort among the semantic queries.
8. **`getByTestId`** — matches `data-testid` (configurable). This is the escape hatch, not the
   default: reach for it when the element genuinely has no accessible role, text, or label (an
   SVG decoration, a drag handle), never because computing the real query felt like more work.

If you find yourself reaching for `getByTestId` on a button or a form field, that's a signal about
the *component*, not the test — add a label or an accessible name and the query gets easier and
the UI gets more accessible, for free.

### How an accessible name gets computed

`getByRole` almost always takes a `name` option, and the name isn't just "the text inside the
element." The browser (and `dom-accessibility-api` in jsdom) computes it by checking, roughly in
this order: `aria-labelledby` (concatenated text of the referenced elements) → `aria-label` →
native labeling (a `<label for>` or a wrapping `<label>`, or `<fieldset><legend>`) → visible text
content → other type-specific fallbacks (`alt`, `title`, `placeholder`). Two elements with
identical visible text can have different accessible names if one carries an `aria-label` that
overrides it — which is exactly the kind of bug `getByRole` catches and `getByTestId` would hide.

`*ByRole` also takes `hidden`, `level`, `pressed`, `selected`, `checked`, and other ARIA-state
options: `getByRole('heading', { level: 2 })` disambiguates an `<h2>` from an `<h1>`;
`getByRole('button', { pressed: true })` asserts a toggle button's `aria-pressed` state directly,
which is more honest than reading component state.

### `get`, `query`, `find` — and `within`

The three prefixes aren't stylistic variants, they encode three different assertions:

- **`getBy*`** throws immediately if zero or more-than-one match exists. Use it when the element
  should already be there.
- **`queryBy*`** returns `null` on zero matches (and still throws on multiple). It's the only
  correct way to assert *absence*: `expect(screen.queryByRole('alert')).not.toBeInTheDocument()`.
  `getBy*` can't express "this shouldn't exist" — it throws before you get to assert anything.
- **`findBy*`** is `getBy*` wrapped in `waitFor`: it polls until the element appears or a timeout
  elapses. Use it for anything that shows up after an async gap — a fetch resolving, a debounce.

`within(element)` scopes any of the above to a subtree — a table row, a specific dialog, one item
in a list of many similar items — instead of asserting against the whole document and hoping
there's only one "Delete" button on the page.

### The mistakes that keep showing up

- **`container.querySelector('.foo')`.** This bypasses the entire point: CSS classes aren't
  perceivable, so a passing test says nothing about usability, and it breaks the moment someone
  renames a class for styling reasons unrelated to the bug you're testing.
- **Asserting on internal state** — reaching into a component instance or a mocked hook's return
  value instead of what actually rendered. If the state changed but the DOM didn't reflect it,
  that's the bug; a test that reads state directly can't see it.
- **Snapshotting whole trees.** A full-component snapshot fails on every unrelated markup change
  and gets rubber-stamped with `--update-snapshots` — it stops proving anything long before anyone
  notices.
- **Misreading an `act` warning.** In React 19, "An update to Component inside a test was not
  wrapped in act(...)" almost always means a state update happened after your assertions ran (a
  timer, an unawaited promise) — the fix is to await the thing that causes the update, not to
  silence the warning.
- **Side effects or fresh assertions inside `waitFor`.** `waitFor`'s callback can run many times;
  put exactly one assertion in it and no mutations. Anything that changes state inside the
  callback multiplies as the callback retries.

### Further reading (optional)

- [Testing Library — About queries and priority](https://testing-library.com/docs/queries/about/)
- [Testing Library — `byRole`](https://testing-library.com/docs/queries/byrole)
- [Kent C. Dodds — Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [MDN — Accessible name and description computation](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Text_labels_and_names)
