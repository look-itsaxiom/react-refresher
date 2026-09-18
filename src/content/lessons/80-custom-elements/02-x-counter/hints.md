Keep a `#clamp(value)` private method that reads `min`/`max` off the element with `getAttribute`
(default to `-Infinity`/`Infinity` when absent) and returns `Math.min(max, Math.max(min, value))`.
Use it in exactly two places: the `value` property setter, and the click handler.
---
The key design point is that only the click handler dispatches `x-change` — the `value` property
setter just clamps and writes the attribute, nothing else. Give the click handler its own private
method (e.g. `#step(direction)`) that reads the `step` attribute, computes the clamped next value,
writes the `value` attribute directly with `setAttribute` (not through the property setter, so the
logic is easy to keep in one place), and then calls `dispatchEvent(new CustomEvent('x-change', ...))`
with that same value in `detail`.
---
Remember the constructor can't touch children — create the three child elements and attach their
click listeners in `connectedCallback`, guarded so it only runs once even if the element
reconnects (e.g. `if (!this.#output) { ...build... }` before the part of `connectedCallback` that
re-renders from current attributes).
---
`attributeChangedCallback` should just re-render from the current attribute values (update the
`<output>` text and the two buttons' `disabled` property) — it doesn't need to know *which*
attribute changed for this exercise. Guard it (and the render step generally) against running
before the buttons/output exist, since attributes can be set before the element is connected.
