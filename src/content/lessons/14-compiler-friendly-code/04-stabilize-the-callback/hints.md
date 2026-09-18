`React.memo` does a shallow compare of props. `todo` only changes identity for the row that
was actually toggled, but `onToggle` is changing identity for *every* row, on *every*
render of `TodoApp` — that's the prop worth investigating.

---

Wrap `toggle` in `useCallback`. Since it only calls `setTodos` with the updater form
(`setTodos((prev) => ...)`), it never actually reads `todos` from the closure, so it can
have an empty dependency array (`[]`) and never needs to change identity.

---

A stable `toggle` isn't enough by itself: `<TodoRow onToggle={(id) => toggle(id)} />`
creates a brand new arrow function on every render, no matter how stable `toggle` is.
Pass `onToggle={toggle}` directly — `TodoRow`'s own `onChange={() => onToggle(todo.id)}`
already supplies the id.
