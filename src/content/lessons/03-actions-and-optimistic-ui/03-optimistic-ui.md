# Optimistic UI with `useOptimistic`

Actions give you correct pending and error states, but the list still updates only when the server answers. For a 600ms round trip that feels sluggish: you type, click, and stare at a disabled button.

**Optimistic UI** shows the expected result immediately and reconciles when the real answer arrives. Before React 19 this meant hand-managing a shadow copy of the list and rolling it back on failure. `useOptimistic` does that bookkeeping.

```tsx
const [optimisticTodos, addOptimisticTodo] = useOptimistic(
  state.todos,                                   // the "real" value
  (current, title: string) => [                  // how to apply one optimistic update
    ...current,
    { id: -1, title, done: false, pending: true },
  ],
);
```

- `optimisticTodos` equals `state.todos` **plus** any optimistic updates applied since the last real value.
- `addOptimisticTodo(title)` applies one update. It must be called **inside an action or transition**.
- When the action finishes and `state.todos` changes (or does not, on failure), React **discards the optimistic updates automatically**. There is no manual rollback.

## Wiring it into a form action

```tsx
const [state, formAction] = useActionState(submit, initialState);
const [optimisticTodos, addOptimisticTodo] = useOptimistic(state.todos, applyAdd);

function handleAction(formData: FormData) {
  addOptimisticTodo(String(formData.get('title')));  // show it now
  formAction(formData);                               // then really do it
}

<form action={handleAction}>
```

`handleAction` runs as the form's action, so it is already inside a transition; calling `addOptimisticTodo` there is legal. `formAction` (from `useActionState`) dispatches the real submission.

## Rendering pending items

Because the optimistic item carries a flag, you can render it differently:

```tsx
<li key={t.id} data-pending={t.pending ? 'true' : undefined} style={{ opacity: t.pending ? 0.5 : 1 }}>
  {t.title}
</li>
```

Use a stable temporary key (like `` `tmp-${title}` ``) for optimistic items; they are replaced by the server's item, which has a real id.

## Failure is the interesting case

If `addTodo` rejects, `submit` returns the previous `todos` plus an error message. `state.todos` did not change, the optimistic entry is dropped, and the alert shows. You wrote no rollback code.

In the exercise, add optimistic todos to the action-based form from the previous exercise.
