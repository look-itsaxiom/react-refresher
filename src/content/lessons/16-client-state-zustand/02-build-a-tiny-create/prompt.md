The sandbox can't install `zustand`, so this exercise builds a miniature of its core idea:
`create(initializer)` returns a hook you call with a selector, on top of
`useSyncExternalStore` from [lesson 9](../09-external-stores).

`create` below is broken. Its `useStore` hook subscribes correctly (no tearing), but its
`getSnapshot` reads and returns the **whole state object**, then applies the selector
afterward, outside `useSyncExternalStore`'s comparison. Since every `setState` call
produces a new state object reference, every subscriber sees a "changed" snapshot on every
update — so a component reading `label` re-renders even when only `count` changed.

Fix `useStore` so `getSnapshot` applies the selector itself, and only the components whose
selected slice actually changed re-render. Do not change `create`'s other internals, the
store's shape, or how the components call `useCartStore`.
