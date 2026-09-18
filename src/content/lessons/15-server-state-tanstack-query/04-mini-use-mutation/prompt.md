Another teaching miniature, same rules as before: this is a small model of `useMutation` +
`invalidateQueries`, not the real `@tanstack/react-query` API.

`App.tsx` has a working add-todo form backed by a shared `todosCache` array and a `useTodosQuery`
hook that reads it (already implemented — you don't need to touch it). `useAddTodoMutation` is
the stub you need to fill in. Right now it does nothing: `mutate` is a no-op, so submitting the
form never calls the server at all.

Implement `useAddTodoMutation()` so it returns `{ mutate, error, isPending }` and, when `mutate(title)`
is called:

1. **Optimistic update.** Immediately push a new entry into `todosCache` (via `setTodosCache`, not
   by mutating the array in place) with the given title, `done: false`, a temporary id that can't
   collide with a server id (a negative number works), and `pending: true`. This has to happen
   *before* `addTodo` resolves — that's the whole point.
2. **Call the server.** Call `addTodo(title)`.
3. **On success, invalidate — don't trust the optimistic guess.** Instead of turning the
   optimistic entry into a "real" one by hand, call the provided `invalidateTodos()` to refetch
   the authoritative list from the server and replace the cache with it.
4. **On failure, roll back.** Restore `todosCache` to what it was *before* your optimistic write,
   and set `error` to the failure's message.
5. **`isPending`** should be `true` from the moment `mutate` is called until the server has
   answered (success or failure).

Keep the pending item rendered as `<li data-pending="true">`; real items should have no
`data-pending` attribute at all (not `data-pending="false"`). Don't change `useTodosQuery`,
`invalidateTodos`, or the JSX structure of the form.
