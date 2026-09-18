Finish `<x-counter>`, a self-contained counter built as a custom element (light DOM, no shadow
root — that's next lesson).

**The one rule this file follows:** `customElements.define` can only be called once per tag name,
and this course's sandbox evaluates your module more than once while grading. So the element is
never registered under a fixed name — everything goes through the exported `define(suffix)`
function, which builds the tag as `` `x-counter-${suffix}` ``, registers it if it isn't already
registered under that exact name, and returns the tag string. Every check (and the default `App`)
calls `define` with its own unique suffix. Don't change this shape.

Requirements for the `XCounter` class:

1. **Rendering (light DOM).** On connect, render a decrement `<button>`, an `<output>`, and an
   increment `<button>`, in that order, as children of the element. `<output>`'s text content is
   always the current value.
2. **`value` — a reflected number.** `observedAttributes` includes `value`. The `value` property
   getter reads the `value` attribute (as a number, defaulting to `0`). The `value` *property*
   setter clamps the number between `min`/`max` (see below) and writes the `value` *attribute* —
   so setting either one keeps the other in sync. Setting the property must **not** dispatch
   `x-change` (see point 4).
3. **`step`, `min`, `max`.** All are plain string attributes, read directly with `getAttribute`
   where needed — no properties required for these three. `step` (default `1` if absent) is the
   amount each button click changes the value by. `min`/`max`, if present, clamp the value; if
   absent, that side is unbounded.
4. **Button clicks.** Clicking increment/decrement changes the value by `step` (clamped by
   `min`/`max`), updates the attribute, re-renders the `<output>`, and dispatches an `x-change`
   event (`bubbles: true`, `composed: true`, `detail: { value }` with the new, already-clamped
   value) — this is the *only* code path that dispatches `x-change`. Setting the `value` property
   or attribute directly from outside code must never dispatch it.
5. **`disabled`.** A plain boolean attribute (`observedAttributes` includes it). When present,
   both buttons are disabled (`button.disabled = true`); when absent, both are enabled.

The default export renders one `<x-counter-…>` for the preview — you don't need to touch it,
`define` is what you're implementing.
