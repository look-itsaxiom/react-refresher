# Two pure helpers: `assignSlots` and `elementProps`

No custom element imperative wiring this time — both functions here are pure, so they're
gradeable by calling them directly and (for `assignSlots`) by checking what actually renders.

## `assignSlots(children, mapping)`

Given a React `children` value and a `mapping` from child **key** to shadow-DOM **slot name**,
return the same children with each mapped child cloned to carry the matching `slot` attribute.
A child whose key isn't in `mapping`, or that isn't a valid element (a stray string, `null`),
passes through unchanged. This is what lets `<XCard>` accept ordinary children with keys and
project them into `<x-card>`'s named slots without every caller having to write
`<h3 slot="title">` by hand.

`App` renders an `<XCard>` (a custom element with `title`/default/`footer` slots — provided,
already defined) via a small wrapper that calls `assignSlots`. Wire the wrapper to actually
call your `assignSlots` with a mapping of `{ heading: 'title', foot: 'footer' }`.

## `elementProps(props, instance)`

A pure model of the same property/attribute/event decision React 19 makes when it renders a
custom element, so you can reason about it without a real DOM. Given a plain `props` object
(as if it came from JSX) and an `instance` object standing in for "what properties does the
custom element's class define," return `{ properties, attributes, listeners }`:

- `className` → `attributes.class` (never `attributes.className`).
- `style` (a plain object of CSS properties) → a single `attributes.style` CSS-text string
  (`"color: red; font-weight: bold;"` — order doesn't matter, checks only compare the parsed
  declarations).
- A key starting with `on` whose value is a function → `listeners[<rest of the name,
  verbatim>]`, e.g. `onrating-change` → `listeners['rating-change']`. Do **not** transform
  case; use exactly what's left after removing `on`.
- Otherwise, if `key in instance` → `properties[key]` (whatever the value is, unchanged).
- Otherwise (no matching instance property, not `on*`, not `className`/`style`):
  - a function value is **omitted** entirely (nothing to stringify, no listener to attach).
  - `true` → `attributes[key] = ''`.
  - `false` or `null`/`undefined` → omitted (no attribute).
  - anything else → `attributes[key] = String(value)`.
