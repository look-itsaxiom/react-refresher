# Build a tag-based cache

Real frameworks give a Server Function's return value a lifetime longer
than one request: Next.js's `"use cache"` plus `revalidateTag`/`updateTag`,
React Router's automatic loader revalidation after an action, and TanStack
Start's `createServerFn` (usually paired with TanStack Query's
`invalidateQueries`) all answer the same question -- after a mutation, how
does a cached read learn it's stale?

`cache` in `App.tsx` models the simplest version of that: a per-tag memo.
Implement it:

- `cached(tag, loader)` should call `loader()` and remember the result
  under `tag`. A later `cached(tag, loader)` call for the *same* tag
  should return the remembered value without calling `loader` again.
- `revalidateTag(tag)` should forget the remembered value for `tag`, so the
  next `cached(tag, loader)` call for it runs `loader` again.

`addTodoAction` is already wired to call `cache.revalidateTag('todos')`
after every mutation -- once your cache is correct, that alone is enough to
keep the list from going stale after an add.

## Why this matters

Returning fresh data from the mutation itself works until a second reader
of the same data exists. Revalidation by tag lets one mutation invalidate
every reader of that data, wherever it lives on the page, without the
mutation and the readers needing to know about each other.
