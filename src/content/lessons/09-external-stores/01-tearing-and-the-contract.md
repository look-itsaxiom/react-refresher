# Tearing and the external store contract

`useState` and `useReducer` assume React owns the data. The moment state lives somewhere
React doesn't manage — a module-level store, `window.matchMedia`, a WebSocket buffer, a
Zustand or Redux store, a TanStack Query cache — that assumption breaks, and the
`useState` + `useEffect` pattern most people reach for first has a real bug, not just a
style problem.

## What tearing actually is

React 18's concurrent renderer can pause a render, let the browser handle other work, and
resume later, or start a render for a low-priority update and abandon it if something
more urgent comes in. If a component reads an external value directly during that paused
render, and the value changes before the render resumes, different parts of the same tree
can end up painting different versions of that value in a single commit. That's tearing:
a sidebar showing `cart.total = 40` next to a header still showing `cart.total = 35`,
both rendered "at the same time" from the user's perspective.

The `useState` + `useEffect` version of a subscription hook is exposed to a narrower but
just as real version of the same problem, independent of concurrent rendering:

```tsx
// Don't do this for external stores.
function useStoreValue<T>(store: { getState: () => T; subscribe: (fn: () => void) => () => void }) {
  const [value, setValue] = useState(() => store.getState());
  useEffect(() => {
    return store.subscribe(() => setValue(store.getState()));
  }, [store]);
  return value;
}
```

The initial value is read during render. The subscription is only registered afterward,
in a passive effect. Anything the store does in between — another component's ref
callback, a layout effect, a synchronous side effect that fires before passive effects
run — is invisible to this hook: no listener existed yet to hear it, and nothing ever
re-checks whether the snapshot is now stale. The update is not delayed. It's dropped.

## The `subscribe`/`getSnapshot`/`getServerSnapshot` contract

`useSyncExternalStore` closes exactly that gap, by contract rather than by convention:

```tsx
const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?);
```

- **`subscribe(onStoreChange)`** registers a listener and returns an unsubscribe function.
  React calls `onStoreChange` to mean "re-read the snapshot and re-render if it differs" —
  it never passes the new value in; `getSnapshot` is the only source of truth for what
  changed.
- **`getSnapshot()`** returns the current value, synchronously, every time it's called.
  React calls it during render (so every component reading the store in the same commit
  sees the same value, closing the tearing gap) and, critically, calls it again
  immediately after `subscribe` runs. If the value already changed in the window between
  the initial render and the subscription being registered, React notices right there and
  schedules a re-render. That's the fix for the dropped-update bug above, and it's why
  reaching for `useSyncExternalStore` is a contract, not a style preference, once data
  lives outside React.
- **`getServerSnapshot()`** is required for anything rendered on the server. It returns
  the value to use during SSR and hydration — usually a fixed default, since most
  external stores (a WebSocket, `navigator.onLine`) don't exist on the server. Omit it and
  React throws during server rendering the moment the hook is reached.

## Snapshot immutability and why a fresh object loops forever

`getSnapshot` must return a value React can compare with `Object.is` against the previous
call. Returning a brand-new object or array every time — `() => ({ ...state })`, or
`() => store.getState().items.filter(...)` recomputed inline — means every call produces
a value that's never `Object.is`-equal to the last one, even when nothing meaningful
changed. React re-renders, calls `getSnapshot` again to confirm, sees another new object,
concludes the store is still changing, and renders again. In development this trips
React's "getSnapshot should be cached" warning; the practical symptom is an infinite
render loop or a component that never stops flashing.

The fix is a **selector**: pick the narrow, stable slice of the store the component
actually needs, and make sure equal input produces referentially equal output — return an
existing primitive or object from the store's own state rather than deriving a fresh one:

```tsx
function useStore<T, S>(selector: (state: T) => S) {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}
```

If two different pieces of state change independently, this snapshot function needs to
memoize the selected value (a `useRef` cache keyed on the last state, or a library like
`use-sync-external-store/with-selector` and `zustand`'s built-in `useStore(selector)`) so
that changing one slice doesn't hand back a new snapshot for a component that only
subscribed to a different slice.

## Where this actually shows up

You'll rarely write a raw `useSyncExternalStore` call for application state — Redux's
`useSelector`, Zustand's `useStore`, Jotai's atoms, and TanStack Query's `useQuery` all
call it under the hood, which is exactly why they don't tear under concurrent rendering
and homegrown context-plus-`useState` stores sometimes do. Where you'll write it directly
is smaller, browser-adjacent hooks: `navigator.onLine`, `window.matchMedia`,
`localStorage` changes from another tab (the `storage` event), a shared WebSocket
connection, or a plain module-level store you built yourself for something that
genuinely lives outside a component tree.

## Further reading (optional)

- [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore) — react.dev
- [Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer) — react.dev (state-outside-React motivation)
- [Zustand: `useStore`](https://zustand.docs.pmnd.rs/hooks/use-store) — zustand.docs.pmnd.rs
- [How `useSyncExternalStore` works internally](https://github.com/facebook/react/blob/main/packages/use-sync-external-store/src/useSyncExternalStoreShimClient.js) — github.com/facebook/react
