This is the action-based form from the last exercise. Add optimistic UI so a new todo appears in the list **immediately** when you submit, before the server responds.

Requirements:

- Optimistic items render as `<li data-pending="true">`; real items have no `data-pending` attribute.
- After the server confirms, the item stays and is no longer pending.
- If the server fails, the optimistic item disappears and the error shows in the `role="alert"` element (that part already works; make sure you do not break it).

Use `useOptimistic`. Keep `submit`, `SubmitButton`, and the input attributes as they are.
