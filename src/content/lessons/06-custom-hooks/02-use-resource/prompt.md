`UserCard` and `PostList` both fetch something on mount and track the same three things:
whether it's loading, whether it failed, and the data once it arrives. The duplication already
caused a bug — `UserCard` was copy-pasted before its author remembered to handle the error case,
so a failed request leaves it stuck on "Loading user…" forever.

Write a custom hook:

```ts
function useResource<T>(loader: () => Promise<T>): { data: T | null; loading: boolean; error: string | null }
```

It should call `loader()` once when the component mounts, and return the current `data`,
`loading`, and `error` state. Guard against setting state after the component has unmounted.

Then rewrite both `UserCard` and `PostList` to use `useResource` instead of their own
`useState`/`useEffect` pairs, so they share one correct implementation — including the error
handling `UserCard` was missing. Don't change the rendered markup (test ids, roles, and text).
