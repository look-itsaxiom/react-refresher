`const [optimisticTodos, addOptimisticTodo] = useOptimistic(state.todos, (current, title: string) => [...current, { id: -Date.now(), title, done: false, pending: true }])`. Render `optimisticTodos`, not `state.todos`.
---
Wrap the form action: a function that calls `addOptimisticTodo(title)` and then `formAction(formData)`. Pass that wrapper to `<form action>`; it runs inside a transition, which is where `addOptimisticTodo` must be called.
---
For the `data-pending` attribute, use `data-pending={t.pending ? 'true' : undefined}` so real items have no attribute at all.
