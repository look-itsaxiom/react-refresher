# Accessible accordion

`FaqAccordion` renders a list of frequently-asked questions. Clicking a question's
header toggles its answer, but the headers are plain `<div>`s with a click handler —
nothing here is a heading, a button, or announced to a screen reader as expandable.

Rebuild it using the APG accordion pattern:

1. **Each header is a heading** (an `<h3>`, matching the level you'd use in the
   surrounding page) **containing a `<button>`** with `aria-expanded` (reflecting
   whether that item is open) and `aria-controls` (pointing at its panel's `id`).
2. **Each panel is `role="region"`**, labelled by its header button via
   `aria-labelledby`, and stays in the DOM at all times — toggle it with the `hidden`
   attribute rather than conditionally rendering it.
3. **By default, more than one panel can be open at once.** Opening one must not close
   any other.
4. **Arrow keys move real focus between header buttons** (this is a small, static set
   of headers, so real focus — not `aria-activedescendant` — is the right model, same
   reasoning as the toolbar in lesson 58): `ArrowDown` moves focus to the next header,
   `ArrowUp` to the previous one, `Home` to the first header, `End` to the last. Each
   header button is still an individually reachable `Tab` stop — arrow keys are an
   addition, not a replacement.

As a stretch, accept a `singleOpen` prop that, when `true`, closes any other open panel
whenever one is opened (leave it `false`/omitted for the default multi-open behavior).
