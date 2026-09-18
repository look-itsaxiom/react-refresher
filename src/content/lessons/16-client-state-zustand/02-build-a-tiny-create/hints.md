`useSyncExternalStore(subscribe, getSnapshot)` decides whether to re-render by comparing
`getSnapshot()`'s return value to the previous call with `Object.is`. Right now
`getSnapshot` is just `getState`, which always returns the same (changed) full-state
object — the selector is applied afterward, too late to affect that comparison.
---
Move the selector call inside the function you pass as `getSnapshot`, so the comparison
happens on the *selected* value, not the whole state object.
---
The whole fix is replacing the body of `useStore`:

```tsx
function useStore<S>(selector: (state: T) => S): S {
  return useSyncExternalStore(subscribe, () => selector(getState()));
}
```

`fullState` and the extra `useSyncExternalStore(subscribe, getState)` call are no longer
needed.
