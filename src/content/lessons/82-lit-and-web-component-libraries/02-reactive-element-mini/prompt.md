`ReactiveElement` below is a tiny, from-scratch stand-in for Lit's base class. It declares
reactive properties via `static properties` and defines an accessor for each one, but the
accessors are naive: every property write re-renders **immediately and synchronously**, even
when several properties change in the same tick, even when a value didn't actually change, and
`reflect: true` properties never get written back to their attribute. `updated()` is always
called with an empty map instead of the properties that actually changed.

Rewrite the property accessors and the render pipeline so that:

- Setting several properties synchronously (e.g. two assignments back to back in one function)
  causes **exactly one** render, batched onto a microtask — not one render per assignment.
- Setting a property to a value that is `Object.is`-equal to its current value does nothing (no
  render, no `updated` call).
- `updateComplete` is a promise that resolves after the next batched render has actually run its
  `render()`/`updated()` pair — code can `await el.updateComplete` to know the DOM caught up.
- A property declared with `reflect: true` gets written to its matching attribute (lowercased
  property name) whenever it changes, and reading that attribute back in via
  `attributeChangedCallback` must **not** re-trigger another reflect-and-fire-the-callback-again
  loop.
- `updated(changed)` receives a real `Map<string, unknown>` of the properties that changed in
  that batch, mapped to their *previous* value.

Do not change `define`, the `Greeting` element's `render()`, or how `App` uses it — only the
`ReactiveElement` base class.
