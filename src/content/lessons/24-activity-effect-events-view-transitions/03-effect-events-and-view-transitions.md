# `useEffectEvent` and `<ViewTransition>`

Two more 19.x primitives, both about separating "what should re-run" from "what should just happen": `useEffectEvent` (stable in 19.2) for effects, `<ViewTransition>` (stable in 19.3) for the pixels on screen when state changes.

## `useEffectEvent`: the rest of the story

You've seen the shape already: an effect that has one dependency it genuinely needs to resync on, and another value it only needs to *read* when something happens.

```tsx
function ChatRoom({ roomId, theme }: { roomId: string; theme: string }) {
  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme); // always the latest theme
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => onConnected());
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // theme is deliberately absent
}
```

`useEffectEvent` gives you a function that always closes over the *latest* render's props and state, but whose identity React treats as effectively constant — it is never itself a reason to rerun an effect, and the lint rule for exhaustive dependencies doesn't ask you to list it. That's the entire feature. It looks small, but it removes a real dilemma: before this hook, "read a fresh value without resubscribing" required a manual ref you kept in sync with an extra effect, which is more code and easier to get wrong than it looks.

The rules are narrow, and worth stating precisely because breaking them silently produces stale or crashing code with no type error:

- **Only call it from inside an effect.** An effect event is not a general-purpose callback. Calling it from a render body, another component, or exporting it up to a parent defeats the mechanism — it exists to be the *last* thing an effect's own logic calls, not a value that travels.
- **Never pass it as a prop or store it in a ref for later.** Its whole contract depends on being called synchronously within the effect (or an effect's own callback), during the same commit. If you find yourself doing `useEffectEvent` and then handing the result to a child, the design is inverted — pass the *data* down and let the child use its own effect.
- **It's not for skipping the dependency array honestly.** If a value is truly reactive — the effect's behavior should differ when it changes — it belongs in the deps array like normal. `useEffectEvent` is for the specific case where a value needs to be *read*, not *reacted to*.

A second, equally common case: an interval or subscription callback that needs the current value of something without restarting the timer every time that something changes.

```tsx
function Ticker({ intervalMs, multiplier }: { intervalMs: number; multiplier: number }) {
  const [count, setCount] = useState(0);
  const onTick = useEffectEvent(() => {
    setCount((c) => c + multiplier); // always the latest multiplier
  });

  useEffect(() => {
    const id = setInterval(onTick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]); // multiplier changes don't restart the interval
}
```

Without `useEffectEvent`, `multiplier` either has to be a dependency (restarting the interval, resetting its phase, every time it changes) or gets captured stale from whichever render created the closure. Neither is right; the hook exists because this shape of bug was common enough to deserve a primitive.

## `<ViewTransition>`: animating a change, not a component

`<ViewTransition>` wraps the browser's [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) so React can drive it from render output instead of you orchestrating `document.startViewTransition` by hand. It only activates for updates React already treats as interruptible and low-priority — `startTransition`, `useDeferredValue`, Actions, and Suspense reveals from fallback to content. A synchronous state update (a plain `setState` outside a transition) commits immediately and opts out, because a view transition can't guarantee that.

```tsx
import { ViewTransition, startTransition } from 'react';

function Gallery({ items, selectedId, onSelect }: GalleryProps) {
  return (
    <ViewTransition>
      {selectedId
        ? <FullImage item={items.find((i) => i.id === selectedId)!} />
        : <Thumbnails items={items} onSelect={(id) => startTransition(() => onSelect(id))} />}
    </ViewTransition>
  );
}
```

Wrapping a subtree in `<ViewTransition>` tells React "when what renders here changes during a transition, animate it" instead of just swapping the DOM. What kind of animation is controlled by class props, each one a `{ default, "some-type": ... }` map (or a single class name) applied depending on what happened to this boundary in that commit:

- **`enter`** — this boundary (or its parent) is newly mounted, and nothing matching is being removed elsewhere.
- **`exit`** — this boundary is being unmounted, with nothing matching taking its place.
- **`update`** — the boundary's own content changed shape, or a nested `<ViewTransition>` resized, without mounting or unmounting.
- **`share`** — a *different* `<ViewTransition>` with the same `name` is unmounting elsewhere while this one mounts. This is the "shared element" case: a thumbnail becoming a full image should cross-fade between the two DOM nodes rather than exit-then-enter as two unrelated things.

Each of those also has an `onEnter` / `onExit` / `onUpdate` / `onShare` callback if you need to run code (not just apply a class) when a phase fires, and the whole thing takes a `ref` typed as a `ViewTransitionInstance` if you need imperative access to the transition itself.

`addTransitionType(type)` (also stable in 19.3) lets you tag *why* a transition is happening — `"navigation-back"`, `"theme-toggle"` — from inside the `startTransition` call that triggers it, so your `enter`/`exit` class maps can key off intent instead of only shape. It's called during the transition, not as a prop.

## What this lesson won't ask you to grade

`<ViewTransition>`'s entire value is a browser animation, and jsdom — the DOM implementation the exercises in this course run checks against — has no View Transitions API at all. There's nothing to assert about a cross-fade in a headless test. The exercise for this half of the lesson is `useEffectEvent`, which is fully synchronous, DOM-visible behavior; treat `<ViewTransition>` as something to recognize, reach for, and configure by reading a component's rendered output, not something a unit test can currently verify. Two things worth knowing anyway: browsers without View Transitions support silently skip the animation and just show the new state (progressive enhancement, not a crash), and a user with `prefers-reduced-motion: reduce` set should generally get little-to-no cross-fade — that's a CSS media query around the transition classes you supply, the same as any other CSS animation, not something React does for you automatically.

## Further reading

- [`useEffectEvent` reference](https://react.dev/reference/react/useEffectEvent)
- [`<ViewTransition>` reference](https://react.dev/reference/react/ViewTransition)
- [`addTransitionType` reference](https://react.dev/reference/react/addTransitionType)
- [MDN: View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
