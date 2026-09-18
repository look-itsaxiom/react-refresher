Snapshot `todosCache` *before* you touch it — `const previous = todosCache;` — so you have
something to hand back to `setTodosCache` if `addTodo` rejects. This is the manual version of what
`onMutate`/`onError` do in real TanStack Query: there's no automatic rollback because the cache
isn't scoped to one component's render the way `useOptimistic`'s state is.

---

`mutate` doesn't need to be `async` itself — it can call `setTodosCache` synchronously for the
optimistic entry, then chain `.then()`/`.catch()` (or an async IIFE) for the server call, updating
`error` and `isPending` from inside those callbacks.

---

On success, resist the urge to merge the optimistic entry with the server's response yourself.
Just call `invalidateTodos()` — it already calls `getTodos()` and replaces the cache with whatever
the server says the list is now, including the real id. That's the "invalidate instead of guess"
half of the exercise.

---

Full shape:

```tsx
function useAddTodoMutation() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function mutate(title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    setError(null);
    setIsPending(true);
    const previous = todosCache;
    setTodosCache([...todosCache, { id: -Date.now(), title: trimmed, done: false, pending: true }]);

    addTodo(trimmed).then(
      () => {
        setIsPending(false);
        invalidateTodos();
      },
      (err: Error) => {
        setTodosCache(previous);
        setError(err.message);
        setIsPending(false);
      },
    );
  }

  return { mutate, error, isPending };
}
```
