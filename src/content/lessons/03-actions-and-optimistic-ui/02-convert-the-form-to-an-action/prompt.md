This todo form works, but it hand-rolls everything: `preventDefault`, a `pending` flag that is never set, error state, and it never clears the input.

Rewrite it with React 19 Actions:

- Use `<form action={…}>` with `useActionState` to hold `{ todos, error }`.
- Move the submit button into a `SubmitButton` component that uses `useFormStatus` to disable itself and show **Adding…** while pending.
- Show server or validation errors in an element with `role="alert"`.
- Keep the input `name="title"` and `aria-label="Title"`, and render todos as `<li>` items.

You should not need `useState`, `onSubmit`, or `preventDefault` when you are done. The input must clear after a successful add; with actions, React does that for you.
