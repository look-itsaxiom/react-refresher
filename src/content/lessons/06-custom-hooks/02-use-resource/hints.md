Both components repeat the same three pieces of state: a `loading` flag, an `error` message, and
the `data` once it arrives. That's the whole shape your hook needs to manage.

---

Write `useResource<T>(loader: () => Promise<T>)`. Keep one piece of state — an object with
`data`, `loading`, and `error` — and set it from inside a `useEffect` that calls `loader()` once.
Use a `cancelled` flag in the effect's cleanup, the same way the starter's `PostList` already
does, so a response that arrives after unmount doesn't call `setState`.

---

Return `{ data, loading, error }` from the hook. Each component calls it with its own loader —
`useResource(() => fetchUser(1))` in `UserCard`, `useResource(() => fetchPosts())` in
`PostList` — and both get the same correct loading/error/success rendering, including the error
branch `UserCard` was missing.
