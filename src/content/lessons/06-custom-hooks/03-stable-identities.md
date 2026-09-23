# Stable identities and hook design

Every render creates new function and object values by default. `() => {}` is a new function
every time the line runs; `{ x: 1 }` is a new object every time. Usually that's fine — React
compares primitives and re-renders cheaply. It stops being fine the moment something depends on
*referential* identity: a `useEffect` dependency array, `React.memo` on a child, or an external
subscription API that uses `===` to know whether to unsubscribe and resubscribe.

## `useMemo` and `useCallback` as escape hatches

React Compiler, stable since React 19, memoizes components and values automatically wherever it
can see the whole picture — most component bodies and most custom hooks written in plain,
rules-of-hooks-compliant code. That covers the common case `useMemo`/`useCallback` used to exist
for (skipping a wasted re-render of a child). It does not cover every case:

- Code outside the Compiler's reach — a file it's configured to skip, or a dependency that ships
  its own hooks and wasn't compiled.
- A value that needs to be stable **as a contract**, not as an optimization: a callback you hand
  to a non-React subscription API, or a dependency your own custom hook lists in a `useEffect`
  that would otherwise resubscribe every render regardless of whether the Compiler memoized the
  caller.

```tsx
function useInterval(callback: () => void, delayMs: number) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    const id = setInterval(() => savedCallback.current(), delayMs);
    return () => clearInterval(id);
  }, [delayMs]); // not `callback` — see useEffectEvent below
}
```

Reach for `useMemo`/`useCallback` when you can point at the specific consumer that needs the
identity to stay put, not by default "for performance." Wrapping everything in `useCallback`
under the Compiler is now actively counterproductive — it's extra code the Compiler already
subsumes, and it can suppress the Compiler's own memoization in files it partially covers.

## `useEffectEvent` inside custom hooks

Stable since React 19.2, `useEffectEvent` extracts the non-reactive part of an effect — logic
that should always see the latest props/state but should never, by itself, cause the effect to
re-run:

```tsx
function useChatRoom(roomId: string, onMessage: (msg: string) => void) {
  const onMessageEvent = useEffectEvent(onMessage); // always latest, never a dependency

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('message', (msg) => onMessageEvent(msg));
    return () => connection.disconnect();
  }, [roomId]); // onMessage is intentionally not listed — that's what useEffectEvent buys you
}
```

Before this hook existed, the workaround was a manually-synced `useRef`, exactly like
`savedCallback` above. `useEffectEvent` is that pattern, built in and correctly typed, and the
`exhaustive-deps` lint understands it: it won't ask you to add an Effect Event to the dependency
array.

## `useSyncExternalStore` for subscription hooks

Any hook that mirrors something outside React — `window.matchMedia`, `navigator.onLine`, a
WebSocket, a third-party store — should use `useSyncExternalStore`, not `useState` plus
`useEffect`. The state-plus-effect version renders once with a possibly-stale value and corrects
itself a tick later; under concurrent rendering it can also **tear**, showing different parts of
the tree reading the external value at different moments. `useSyncExternalStore` reads
synchronously during render and guarantees every consumer in the same commit sees the same value:

```tsx
function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener('online', onChange);
      window.addEventListener('offline', onChange);
      return () => {
        window.removeEventListener('online', onChange);
        window.removeEventListener('offline', onChange);
      };
    },
    () => navigator.onLine,
    () => true, // server snapshot, if this ever runs during SSR
  );
}
```

`useMediaQuery(query)` follows the same shape against `window.matchMedia(query)`. jsdom (the DOM
used to grade exercises in this course) doesn't implement `matchMedia` at all, so an exercise
built around it needs a small stub injected as the subscription source — real code targets the
browser API directly.

## `useId` for accessibility wiring

`useId` generates a stable, unique string for the lifetime of a component instance, meant for
linking a label to an input or a description to a field — never as a list `key`, and never as
an input to randomness or hashing:

```tsx
function LabeledInput({ label }: { label: string }) {
  const id = useId();
  return (
    <>
      <label htmlFor={id}>{label}</label>
      <input id={id} />
    </>
  );
}
```

It exists specifically because `Math.random()` or a module-level counter breaks under server
rendering (mismatched ids between server and client) and under `<StrictMode>`'s double-invoked
renders. `useId` is generated the same way on both, every time.

## Testing a hook in isolation

`@testing-library/react`'s `renderHook` mounts a throwaway component just to call your hook and
exposes `result.current`:

```tsx
import { renderHook, act } from '@testing-library/react';

test('useDebouncedValue delays updates', async () => {
  const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
    initialProps: { value: 'a' },
  });
  rerender({ value: 'ab' });
  expect(result.current).toBe('a'); // hasn't caught up yet
  await act(() => new Promise((r) => setTimeout(r, 250)));
  expect(result.current).toBe('ab');
});
```

This is the right tool when a hook's logic is worth testing independently of any one component
that happens to use it — which is usually a good sign the extraction was worth doing in the
first place.

## Further reading (optional)

- [`useMemo`](https://react.dev/reference/react/useMemo) and [`useCallback`](https://react.dev/reference/react/useCallback) — react.dev
- [`useEffectEvent`](https://react.dev/reference/react/useEffectEvent) — react.dev
- [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore) — react.dev
- [`useId`](https://react.dev/reference/react/useId) — react.dev
- [`renderHook`](https://testing-library.com/docs/react-testing-library/api/#renderhook) — testing-library.com
