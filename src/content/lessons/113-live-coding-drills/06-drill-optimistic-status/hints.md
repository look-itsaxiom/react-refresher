Wrap each row's toggle button in its **own** `<form action={() => handleToggle(t.id)}>`.
Call `addOptimisticToggle(id)` as the very first line inside `handleToggle`, before the
`await toggleTodo(id)` — React needs the optimistic update issued synchronously within the
action so it can revert it automatically once the action's transition finishes.

---

`useFormStatus()` only sees the closest enclosing `<form>`. Put it in a small child component
rendered inside each row's form (not the row's parent) — that's what scopes `pending` to just
that row instead of the whole board.

---

An uncontrolled `<input name="title">` inside a `<form action={...}>` resets itself once the
action function returns — you don't need to call `setTitle('')` yourself if you're not
controlling the input's value. That's also why `useActionState`'s form doesn't need manual
reset code in the `03-actions-and-optimistic-ui` lesson.

---

One `aria-live="polite"` `<div>` is enough for both error sources — render whichever error is
currently set (`toggleError ?? addState.error ?? ''`). An empty string is a valid, harmless
child; you don't need to conditionally omit the div.
