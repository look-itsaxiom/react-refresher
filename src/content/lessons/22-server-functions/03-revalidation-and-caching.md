## After the mutation: revalidation and caching

A Server Function that mutates data has two ways to leave the UI in a
correct state afterward, and mixing them up is where most "why is this
list stale" bugs come from.

**Return the fresh value.** The mutation's own response becomes the new
truth — `createTodoAction` returns the updated list, and `useActionState`
puts it straight into `state`. This is exactly what lesson 3's exercises
did, and it's enough as long as only one place on the page reads that data.

**Revalidate a cache.** As soon as a second reader exists — another
component, another route, a cached page rendered minutes ago — returning
fresh data to the caller doesn't fix what everyone else is looking at. You
need to tell the cache itself "this is stale," so the next read (from
anywhere) fetches again.

### How each framework names this

**Next.js 16** ships this as **Cache Components**: the `"use cache"`
directive opts a function, component, or page into caching, replacing the
older implicit fetch-level caching. Caching under `"use cache"` is
tag- and path-addressable, and invalidated with two different functions:

- `revalidateTag(tag)` / `revalidatePath(path)` mark cached entries stale
  and trigger a stale-while-revalidate refresh — the old value can still be
  served briefly while the new one loads in the background. This is the
  right default for content other users will eventually see.
- `updateTag(tag)`, callable only from inside a Server Function, updates
  the tag's cached value immediately, so the *same* request that performed
  the mutation can read its own write without waiting on a background
  refresh. Reach for it specifically for "the user who just submitted this
  form should see the result right now" — the classic read-your-own-writes
  case.

```ts
'use server';
import { updateTag } from 'next/cache';

export async function createTodoAction(formData: FormData) {
  const todo = await db.todos.create({ title: formData.get('title') });
  updateTag('todos'); // this response's own re-read sees the new todo
  return { ok: true, todo };
}
```

**React Router 8** takes a coarser but simpler default: after any `action`
runs, React Router automatically revalidates *every* loader on the current
page, with no cache to name or tag. `shouldRevalidate` lets a specific
route opt out when it can tell from the action's result that nothing it
cares about changed — useful once automatic revalidation starts costing
more requests than it saves.

**TanStack Start**'s `createServerFn` doesn't prescribe a cache story on its
own; it's commonly paired with TanStack Query, where a mutation's
`onSuccess` calls `queryClient.invalidateQueries` — the same tag-shaped
invalidation model, keyed by query key instead of a string tag (lesson 15
covered this pairing in depth).

Different names, same shape: mark something stale by a key, and the next
read for that key does the real work of fetching again.

### Where `useOptimistic` fits

Revalidation and `useOptimistic` solve different halves of the same
problem. Revalidation is about the source of truth catching up after a
write; `useOptimistic` is about not making the user stare at a spinner
while it does. You still show the guessed state immediately, still call
the Server Function, and still let the real state (returned directly, or
arriving via revalidation) replace the guess when it lands — `useOptimistic`
discards the guess automatically the next time the underlying state
updates, whichever mechanism produced that update.

### Error handling and the `useActionState` return shape

Treat a Server Function's return type as a small state machine, not just a
success payload:

```ts
type ActionResult =
  | { ok: true; todos: Todo[] }
  | { ok: false; errors: Record<string, string> };
```

Every code path — validation failure, auth failure, a thrown exception from
the "real" work — should produce one of these, never an uncaught throw.
`useActionState`'s second value from its updater is the *next* `state`, so
returning a consistent shape (not `undefined`, not sometimes throwing) is
what keeps every consumer of `state` simple.

### Testing a Server Function

Because a Server Function is "just" an async function once you strip the
directive away, you test it the same way this lesson's exercises grade
one: call it directly with a `FormData` (or plain arguments) and assert on
the returned shape, independent of any UI. Reserve rendering a form and
clicking through it for tests that are actually about the form's behavior
(loading states, focus, accessibility) — the function's own logic doesn't
need a DOM to verify.

### Further reading

- [Next.js docs: revalidateTag](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [Next.js docs: updateTag](https://nextjs.org/docs/app/api-reference/functions/updateTag)
- [Next.js docs: "use cache" directive](https://nextjs.org/docs/app/api-reference/directives/use-cache)
- [React Router docs: Actions](https://reactrouter.com/start/framework/actions)
- [TanStack Start docs: Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
