This "add a todo" form uses `useActionState`, but it has three problems typical of a first pass
at server-validated forms:

1. It tracks a single `error: string | null`, so if more than one field is wrong you can only
   ever show one message, and it can't say *which* field is wrong.
2. It has no client-side length check on the title — every submission round-trips to the server
   even for input that's obviously too long.
3. After a failed submission, both fields go blank. React resets uncontrolled fields once a
   form action finishes running — success or failure — so unless you feed the typed values back
   in as `defaultValue`, the user's input just vanishes along with the error.

Fix all three:

- Change the state to `{ todos, errors: { title?: string; owner?: string }, values: { title: string; owner: string } }`.
- Before calling the server, reject a `title` longer than 40 characters client-side (no
  `@server` round trip for that rule) and reject a blank `owner` client-side.
- `@server/todos`'s `addTodo` still rejects a blank title after trimming — surface *that*
  rejection as `errors.title`, not a banner.
- Whenever the action returns with errors, include the submitted values in `values` and bind
  each input's `defaultValue` to `state.values.<field>` so a failed submission doesn't erase what
  the user typed.
- Give each error message an `id` and point the matching input's `aria-describedby` at it (and
  set `aria-invalid` while the error is showing).

On success, clear `values` back to `{ title: '', owner: '' }` and add the todo to the list as
before.
