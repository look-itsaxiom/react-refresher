`useSyncExternalStore` takes `(subscribe, getSnapshot)`. `subscribe` can be `source.subscribe`
directly — it already has the right shape, `(listener) => () => void`.
---
`getSnapshot` is where the selector goes: `() => selector(source.getState())`. You don't
need `useState` or `useEffect` at all anymore; `useSyncExternalStore` replaces both.
---
The whole fixed hook is three lines:

```tsx
function useStore<T, S>(source: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(source.subscribe, () => selector(source.getState()));
}
```
