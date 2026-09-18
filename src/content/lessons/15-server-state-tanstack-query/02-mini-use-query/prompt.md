`@tanstack/react-query` isn't available in this sandbox, so this exercise has you build a
**miniature** of its core mechanic — just enough of it to feel the difference between fetching in
`useEffect` and fetching through a shared cache. It is a teaching model, not the real library's
API; don't expect this shape to match `@tanstack/react-query` exports.

`App.tsx` renders two components, `UserA` and `UserB`, that both want the same user, through a
`useUserQuery` hook that fetches independently in a `useEffect` — the exact pattern lesson 6's
`useResource` also uses, just with two call sites this time. Watch `stats.fetchCount` and you'll
see it hit `2`: two components, two identical requests, no cache in between.

Replace `useUserQuery` with a real `useQuery`:

```ts
function useQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { staleTime?: number },
): { data: T | null; loading: boolean; error: string | null }
```

built on top of the module-level `cache` `Map` that's already declared for you. It must:

1. **Dedupe.** Two components calling `useQuery` with the same `key` while nothing is cached yet
   should trigger exactly one call to `fetcher`, not one per component.
2. **Serve stale data instantly, then revalidate.** Once a key has been fetched, mounting a
   component with that key again shows the cached `data` immediately — `loading: false` on the
   very first render, no spinner — even if the entry is older than `staleTime` and a background
   refetch is about to run.
3. **Support `invalidate(key)`.** The exported `invalidate` function should drop that key from the
   cache, so the next component to read it fetches fresh instead of reusing the old value.
4. **Not blow up on unmount.** If a component using `useQuery` unmounts before its fetch resolves,
   the response should still update the shared cache (so a later mount sees it), but must not
   try to update state on the unmounted component.

Use `UserA`/`UserB` to build and check dedupe; you can render either standalone to check the
remount/staleness behavior. Don't change `stats`, `invalidate`, or the `Entry` type's shape — the
checks read them directly.
