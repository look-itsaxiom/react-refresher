# Mutations, invalidation, and where it meets React 19/RSC

`useQuery` reads. `useMutation` writes, and deliberately does *not* cache its result the way a
query does — a `POST /todos` isn't something a second component should transparently "read" from
a shared key. Instead it hands you an imperative trigger and lets you decide how the write should
affect the read-side cache.

```tsx
const queryClient = useQueryClient();

const { mutate, isPending } = useMutation({
  mutationFn: (title: string) => addTodo(title),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

`invalidateQueries` doesn't refetch synchronously and doesn't touch the cached value directly — it
marks matching keys stale and, for every currently-mounted observer of those keys, triggers a
background refetch. That's usually the right default after a mutation: rather than trying to
predict the server's exact post-write state (pagination, sorting, computed fields), just ask the
server again. `setQueryData(key, updater)` is the other tool, for when you already *have* the true
next value and refetching would be wasted work — writing a mutation's response straight into the
cache, or the optimistic update below.

## Optimistic updates, and why they're manual here

React 19's `useOptimistic` (lesson 3) shows a value immediately and lets React discard it
automatically once the real state settles — it works because the "real state" is local
`useState`/`useActionState`, owned by that one component tree. A TanStack Query cache is shared
and long-lived, so there's no single render's `state` for React to diff against; the library gives
you the write instead, as three mutation callbacks:

```tsx
useMutation({
  mutationFn: (title: string) => addTodo(title),
  onMutate: async (title) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previous = queryClient.getQueryData<Todo[]>(['todos']);
    queryClient.setQueryData<Todo[]>(['todos'], (old) => [
      ...(old ?? []),
      { id: Date.now(), title, done: false },
    ]);
    return { previous }; // the mutation's "context", passed to onError/onSettled
  },
  onError: (_err, _title, context) => {
    if (context) queryClient.setQueryData(['todos'], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

`cancelQueries` first, so a background refetch that was already in flight can't land after your
optimistic write and clobber it. Snapshot the previous value so `onError` has something to restore
— there is no automatic rollback because the library has no idea what "before" looked like unless
you hand it over. `onSettled` (success or failure) invalidates regardless, so the optimistic guess
is always reconciled against the server's actual answer, not trusted forever.

## Suspense, not booleans

`useSuspenseQuery` drops `isPending`/`isError` entirely — it suspends the component until data
arrives and lets the nearest `<Suspense>` fallback and error boundary handle the other two states,
the same contract lesson 9's `use()` and Suspense boundaries already taught:

```tsx
function UserCard({ id }: { id: number }) {
  const { data } = useSuspenseQuery({ queryKey: ['user', id], queryFn: () => fetchUser(id) });
  return <p>{data.name}</p>; // data is never undefined here — TypeScript knows it too
}
```

This is the version worth reaching for by default in 2026: no `if (isPending)` branch to forget,
and the type of `data` is narrowed for you instead of being `T | undefined` everywhere.

## Prefetching and streaming SSR

A route loader (React Router 8's `loader`, a Next.js 16 Server Component, TanStack Start) can call
`queryClient.prefetchQuery(...)` before the page renders, so the client-side `useSuspenseQuery`
for the same key resolves instantly from cache instead of triggering a second waterfall on
hydration. Frameworks stream that prefetched cache down with `dehydrate`/`HydrationBoundary` so
the server's fetch and the client's cache agree without a duplicate request.

## Where Server Functions and RSC take over instead

None of this is needed for data a Server Component reads to render its own output — it fetches
during the server render, ships HTML (or an RSC payload), and there's no client cache to manage
because the client never re-fetches it on its own. The two aren't competitors: RSC replaces the
*initial* read for content that's fine as of the last server render, while TanStack Query still
owns anything the client needs to refetch, poll, or mutate after that — a live comment count, an
optimistic like button, "refetch on window focus." A Server Function (lesson 22) is a natural
`mutationFn` in an app that otherwise leans on RSC: call it from `onMutate`, invalidate the
relevant query, done. Reach for Query when the client needs to *ask again*; reach for RSC/Server
Functions when the server can just tell you at render time.

## Interview angle

This is the mechanism behind "a vendor updates a task's ETA and the customer's dashboard reflects it." A strong answer distinguishes `invalidateQueries`, which marks a key stale and lets every mounted observer refetch in the background, from `setQueryData`, which writes a known value directly when you already have it, like the mutation's own response. For data your own UI owns end to end, like renaming a task, an optimistic update via `onMutate`/`onError`/`onSettled` is reasonable. For data another company controls, like a vendor's shipment status, invalidating and refetching the server's actual answer is usually the safer default, since you can't reliably predict what a system outside your control will return. It's also worth naming `useSuspenseQuery` over manually checking `isPending`, since a task detail pane that suspends into a shared boundary composes better with the rest of a multi-panel layout than one more `if (isPending)` branch per component.

**Likely follow-up:** Two people, one on the customer side and one on a vendor, edit the same task's due date within a second of each other. Walk through what invalidation does and doesn't solve here, and where you'd need something more, like a version field or a conflict UI.

**Pitfall:** Defaulting to optimistic updates for data you don't fully control or can't see the true next state of, like a cross-company dependency graph, then having no reliable "previous" snapshot to roll back to when the write fails or a concurrent edit lands first.

## Further reading (optional)

- [Mutations](https://tanstack.com/query/v5/docs/framework/react/guides/mutations) — tanstack.com
- [Optimistic Updates](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates) — tanstack.com
- [Suspense](https://tanstack.com/query/v5/docs/framework/react/guides/suspense) — tanstack.com
- [SSR & Streaming](https://tanstack.com/query/v5/docs/framework/react/guides/ssr) — tanstack.com
