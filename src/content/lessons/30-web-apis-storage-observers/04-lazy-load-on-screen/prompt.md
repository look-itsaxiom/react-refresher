This list renders all 200 rows' full content immediately, whether or not they're
anywhere near the viewport — expensive if each row were doing real work (formatting,
images, charts).

`useOnScreen(ref)` is stubbed to always return `true`, which is why every row renders
its full content right away. Implement it properly:

```ts
function useOnScreen(ref: React.RefObject<Element | null>): boolean
```

It should:

1. Create an `IntersectionObserver` (the real one in a browser; a fake with the same
   shape is already installed for you in this sandbox — just use the global
   `IntersectionObserver` constructor, don't reference the fake directly).
2. `observe()` the current ref's node once it's mounted.
3. Update and return `true`/`false` based on the entry's `isIntersecting` for *that*
   node — an observer can report on other targets too, so check `entry.target`.
4. `disconnect()` the observer when the component unmounts, so nothing keeps observing a
   node that no longer exists.

Don't change `Row`, `App`, or the row count. Once `useOnScreen` is correct, a row should
render its lightweight placeholder until it's marked on-screen, then swap to its full
content — and never observe forever after it's gone.
