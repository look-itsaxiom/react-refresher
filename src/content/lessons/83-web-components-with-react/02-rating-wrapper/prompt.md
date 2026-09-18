# Wrap `<x-rating>` in a typed React component

The starter defines (and registers) a tiny custom element, `<x-rating>`:

- `value: number` — a real class property (get/set), not just an attribute.
- `max: number` — same, a real class property.
- `reset(): void` — an instance method that sets `value` back to `0`.
- On click, it advances `value` by one (wrapping to `0` past `max`) and dispatches a
  `rating-change` `CustomEvent` whose `detail.value` is the new value.

Nobody using `<Rating>` should have to know any of that. Build the wrapper:

1. `Rating` accepts `value`, `max`, `onChange(value: number)`, and a `ref` (as a plain prop —
   no `forwardRef`).
2. Keep it controlled: whatever `value`/`max` the parent passes should end up as the *property*
   on the underlying element (not stringified into an attribute), every render.
3. When the element dispatches `rating-change`, call the parent's `onChange` with
   `detail.value`. Attach and remove this listener yourself — `rating-change` is not a name
   React's exact-match event binding will pick up from an `onChange` prop, so don't rely on it.
4. Expose `{ reset(): void }` through the `ref` with `useImperativeHandle`, calling the
   element's real `reset()` method.
5. Clean up the listener on unmount (and whenever the callback identity changes).

`App` already renders a `<Rating>` with a "Reset" button; make it actually work.
