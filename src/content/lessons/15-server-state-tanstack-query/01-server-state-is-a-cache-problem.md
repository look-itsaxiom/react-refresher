# Server state is a cache problem

Lesson 6's `useResource` hook fixed a real bug — an unhandled rejection that left a component
stuck on "Loading…" forever — by extracting the load/error/success dance into one hook. It's
still, in every copy that calls it, its own island: each call site fetches independently, keeps
its own `data`/`loading`/`error` triple, and forgets everything the moment the component
unmounts. That's fine for state your component owns outright — a text input's draft value, a
dialog's open flag. It's the wrong model for **server state**: data that lives somewhere else,
that other users or other tabs can change without telling you, that can go stale while you're not
looking, and that more than one component on the page usually wants at once.

Treating server state like client state is why `useEffect` fetching earned a bad reputation, not
because `useEffect` is broken:

- **No dedupe.** `<UserCard>` and `<Sidebar>` both rendering `useResource(() => fetchUser(1))`
  fire two identical requests. Nothing between them knows they want the same thing.
- **No cache.** Navigate away and back, and the component starts over at `loading: true`, even
  though the data hasn't changed and you fetched it four seconds ago.
- **Waterfalls.** A child's `useEffect` can't start until the child mounts, which can't happen
  until the parent's own effect resolves and renders it — each hop adds a full round trip that
  parallel fetching would have avoided.
- **Races.** If `id` changes while a request for the old `id` is still in flight, the old
  response can resolve *after* the new one and overwrite it with stale data. The `cancelled` flag
  in `useResource` stops the state update, but nothing coordinates two components fetching the
  same key — that requires shared state, not a per-instance guard.

None of these are solvable by writing a better `useEffect`. They're solvable by not fetching in
components at all — by putting a cache in front of the network and letting components read from
it. That's the entire idea behind **TanStack Query** (the project formerly called React Query,
now with first-class Vue, Svelte, Solid, and Angular adapters): a `QueryClient` that owns a
`Map`-like store of query results, keyed by whatever you ask for, shared across every component
in the tree via `QueryClientProvider`. By the State of React 2025 developer survey, it's the data
layer the plurality of production React apps reach for by default — reasonable, since "cache
requests, dedupe them, and revalidate in the background" is not code most teams want to own.

## The shape of `useQuery`

```tsx
import { useQuery } from '@tanstack/react-query';

function UserCard({ id }: { id: number }) {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
    staleTime: 60_000,
  });

  if (isPending) return <p>Loading…</p>;
  if (isError) return <p role="alert">{error.message}</p>;
  return <p>{data.name}</p>;
}
```

`isPending` replaced `isLoading` as the "no data yet" flag as of v5 (`isLoading` is now
`isPending && isFetching`, useful for distinguishing a first load from a disabled query with no
data). Two components rendering this hook with `queryKey: ['user', 1]` share one cache entry and
one in-flight request — mount both at once and exactly one network call happens. That's the
dedupe `useResource` couldn't give you.

## Keys are dependencies, not labels

`queryKey` is an array, compared structurally (`['todos', { status: 'done' }]` matches another
call with the same shape, key order in the object included), and it plays the same role a
dependency array plays for `useEffect`: everything the query function reads that should trigger a
refetch belongs in the key. `['todos']` and `['todos', { userId }]` are different cache entries on
purpose — filter or scope a query by putting the filter in the key, not by re-fetching inside the
same key and hoping to remember to invalidate it later.

## The lifecycle: fresh → stale → inactive → collected

A query result isn't just "cached" or "not cached" — it moves through states, governed by two
independent timers:

- **`staleTime`** (default `0`): how long a result counts as fresh. A fresh result is served from
  cache with no network call, even on remount. The instant it goes stale, TanStack Query still
  shows the cached value immediately, but refetches in the background on the next trigger — a
  new mount, the window regaining focus, or the network reconnecting. This is why `useEffect`'s
  perpetual `loading: true` on remount feels so much worse in comparison: stale-while-revalidate
  means the user sees content instantly and gets a silent update, not a spinner.
- **`gcTime`** (default 5 minutes, renamed from `cacheTime` in v5): how long a query with no
  mounted observers is kept around before its cache entry is deleted. Unmount every component
  using `['user', 1]`, and the entry sits inactive until `gcTime` elapses or the query is
  invalidated first — remount within that window and it's an instant, no-request hit.

Setting `staleTime: Infinity` for data that never changes on its own (a static config blob) turns
off background refetching entirely for that key; setting `staleTime: 0` on data that changes
often (a live order queue) means every remount revalidates. Both are deliberate settings, not a
single "right" default — the default of `0` favors correctness over request volume, which is the
safer failure mode for data you don't own.

## Further reading

- [Important Defaults](https://tanstack.com/query/v5/docs/framework/react/guides/important-defaults) — tanstack.com
- [Query Keys](https://tanstack.com/query/v5/docs/framework/react/guides/query-keys) — tanstack.com
- [Caching](https://tanstack.com/query/v5/docs/framework/react/guides/caching) — tanstack.com
- [State of React 2025](https://stateofreact.com/) — Devographics
