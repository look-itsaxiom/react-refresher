# You might not need an effect

The most common effect bug isn't a missing dependency or a missing cleanup — it's an effect that shouldn't exist. If you've ever written `useEffect` to copy one piece of state into another, or to react to a button click that already has a handler, you've written this bug. Here is how to recognize it and what to reach for instead.

## Derive it, don't store it

Anything computable from existing props or state during render should be computed during render, full stop:

```tsx
// ❌ two sources of truth, one render behind
const [items, setItems] = useState(initial);
const [total, setTotal] = useState(0);
useEffect(() => setTotal(items.reduce((s, i) => s + i.price, 0)), [items]);

// ✅ one source of truth; the rest is arithmetic
const [items, setItems] = useState(initial);
const total = items.reduce((s, i) => s + i.price, 0);
```

The effect version renders twice for every change to `items`: once with the stale total, then again once the effect corrects it. It's slower, and there's a real frame where the UI shows an inconsistent state. "But it's expensive to recompute" is mostly not a reason to reach for an effect either — memoize the *value* with `useMemo` if profiling says so, or let the React Compiler do it, rather than promoting a derived value to a second, effect-synchronized state variable.

## Reset state with `key`, not an effect

```tsx
// ❌ an effect chasing a prop change
useEffect(() => setDraft(''), [userId]);

// ✅ a new key means a new component instance, with fresh state
<ProfileForm key={userId} userId={userId} />
```

Changing an element's `key` tells React "this is a different thing," so it unmounts the old instance (discarding its state, no explicit reset needed) and mounts a new one from scratch. The effect version has the same "one render behind" problem as derived state: React commits the stale value first, then the effect fixes it a moment later.

## Event-driven logic belongs in the event handler

```tsx
// ❌ an effect watching a flag a handler just set
const [justSubmitted, setJustSubmitted] = useState(false);
useEffect(() => {
  if (justSubmitted) {
    showToast('Saved!');
    setJustSubmitted(false);
  }
}, [justSubmitted]);

function handleSubmit() {
  save();
  setJustSubmitted(true);
}

// ✅ the handler already knows what happened
function handleSubmit() {
  save();
  showToast('Saved!');
}
```

If you know *why* something happened — the user clicked Save — say so directly in the click handler. An effect only knows *that* state changed, not why, which is strictly less information for no benefit. Reach for an effect when the *component* needs to react to a prop or state change regardless of what caused it (e.g., "resync whenever `roomId` changes, whether that's from a click, a URL change, or a parent re-render").

## Subscribing to something outside React: `useSyncExternalStore`

Some effects genuinely subscribe to an external store — `window.matchMedia`, browser online/offline status, a state manager. The naive version (`useEffect` + `useState`, set the value on every notification) can **tear** under concurrent rendering: React can render a component twice with two different snapshots of a store that changed mid-render, so different parts of the tree briefly disagree. `useSyncExternalStore(subscribe, getSnapshot)` is the hook built specifically to read an external, mutable source without tearing, and it's the right choice any time an effect exists purely to keep a `useState` in sync with something else.

## `useEffectEvent`: pulling non-reactive logic out of an effect

Stable since React 19.2, `useEffectEvent` solves a narrower problem: an effect that has one truly reactive dependency and one "read the latest value but don't resubscribe because of it" dependency.

```tsx
function ChatRoom({ roomId, theme }: { roomId: string; theme: string }) {
  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme); // always reads the latest theme
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => onConnected());
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // theme is not, and should not be, a dependency
}
```

Before `useEffectEvent`, you had two bad options: list `theme` as a dependency (and reconnect every time the user toggles dark mode, which is wrong), or omit it and read a stale closure (also wrong, and flagged by the lint rule). A function created by `useEffectEvent` always sees the latest props and state without ever being a reactive dependency itself, so the effect above only resyncs when `roomId` actually changes.

## Two niches you'll rarely reach for directly

- **`useLayoutEffect`** runs synchronously after DOM mutations but *before* the browser paints. Use it only when you must measure the DOM (an element's size, scroll position) and synchronously adjust something before the user sees a flicker. It blocks paint, so it's slower than `useEffect` — don't reach for it by default.
- **`useInsertionEffect`** runs even earlier, before layout effects, and exists almost exclusively for CSS-in-JS libraries that need to inject `<style>` tags before any layout effect reads computed styles. You will use libraries that call it; you will almost never call it yourself.

The theme running through all of this: effects are for keeping a component in sync with something *outside* React's own render output. State, derived values, keys, and event handlers cover everything *inside* it.

## Further reading (optional)

- [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [`useEffectEvent`](https://react.dev/reference/react/useEffectEvent)
- [`useSyncExternalStore`](https://react.dev/reference/react/useSyncExternalStore)
- [`useLayoutEffect`](https://react.dev/reference/react/useLayoutEffect)
