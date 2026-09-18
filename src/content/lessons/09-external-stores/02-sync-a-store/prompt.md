`useStore` below reads the shared `store` (a plain module-level object with
`getState`/`setState`/`subscribe`, no React involved) using `useState` plus `useEffect`.
It looks fine, and mostly works — but it can permanently miss an update that happens
in the narrow window between the component's initial render and its effect subscribing.

Rewrite `useStore` on top of `useSyncExternalStore` so it can't miss that update, and so a
component that only selects `state.label` never re-renders when only `state.count`
changes.

Do not change `createStore`, the `store` instance, or how the display components call
`useStore`.
