`useCallback` is only worth its complexity when something downstream depends on the callback's identity staying the same (a memoized child, an effect's dependency array). Nothing here does. You can delete the `useCallback` wrapper and just define a normal function, or inline the call in `onChange`.

---

`useMemo`'s dependency array is a promise: "this only needs to change when one of these values changes." The factory function here reads `tag`, so `tag` has to be in that array, or the promise is a lie — the memoized value goes stale exactly when `tag` changes without `query` also changing.

---

Add `tag` to the dependency array: `[query, tag]`. That alone fixes the stale-filter bug. The `useCallback` removal is independent — just stop wrapping `handleQueryChange` and call `setQuery` directly (or keep a plain, unwrapped function if you want to keep the extra layer of naming).
