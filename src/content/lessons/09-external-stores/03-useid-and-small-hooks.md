# useId and other small hooks

`useSyncExternalStore` is the big one for correctness. React 18 and 19 also shipped a
handful of small, single-purpose hooks that fix specific footguns rather than adding new
capability. They're easy to skip past because none of them show up in a typical component
— until the specific problem they solve hits, at which point they're the only fix.

## `useId`: stable ids that survive SSR and StrictMode

Any id that links a `<label>` to an input, or an input to its error/hint text via
`aria-describedby`, has to be unique per instance and identical between server and client
render. The instinctive options both break:

- `Math.random()` or a module-level incrementing counter produces a different id on the
  server than on the client (or a different id on every render), so hydration mismatches:
  React warns, and in the worst case the label and input end up pointing at different
  elements after hydration reconciles them.
- A hardcoded string (`id="name"`) works for exactly one instance of a component. Render
  the same form field component twice on one page and both instances share an id, which
  makes `<label htmlFor="name">` ambiguous and breaks `getByLabelText`-style queries as
  well as real assistive technology, which will only associate the label with the first
  matching element.

`useId` generates a stable, opaque string, unique per component instance, generated the
same way during server rendering and client hydration:

```tsx
function LabeledField({ label, hint }: { label: string; hint: string }) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-describedby={hintId} />
      <p id={hintId}>{hint}</p>
    </div>
  );
}
```

Two rules worth stating explicitly because people get them backwards: never use `useId`
to generate a list `key` (keys need to track identity across data, not component
instances — use a stable field from the data itself), and never feed a `useId` value into
hashing, encryption, or anything that assumes unpredictability. It's structured for
uniqueness within a render tree, not for randomness — React reuses the same format
(something like `:r1:`) predictably so server and client agree, which is the opposite of
what you'd want from a security token.

## `useInsertionEffect`: for CSS-in-JS libraries, not app code

`useInsertionEffect` runs even earlier than `useLayoutEffect` — before any DOM mutations
from the current commit are applied to the page, and specifically before layout effects
read layout. Its one job is injecting `<style>` tags before the browser has a chance to
lay out the affected elements with the wrong styles, which is why it exists almost
exclusively inside libraries like styled-components and Emotion:

```tsx
function useCSS(rule: string) {
  useInsertionEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = rule;
    document.head.appendChild(styleTag);
    return () => styleTag.remove();
  }, [rule]);
}
```

You will not write this in application code. Refs are not attached yet when it runs, so
it can't be used for anything DOM-measurement related — that's what `useLayoutEffect` is
for. The reason to know it exists is recognizing it in a library's source and understanding
why it's not a bug that it runs "too early" for a normal effect.

## `useDebugValue`: labeling a custom hook in React DevTools

`useDebugValue` adds a label to a custom hook's entry in React DevTools' component
inspector. It has zero effect on behavior or rendering:

```tsx
function useOnlineStatus() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  useDebugValue(online ? 'Online' : 'Offline');
  return online;
}
```

Reach for it in a hooks library, or any custom hook whose internal state isn't obvious
from its return value, so a teammate debugging with DevTools sees `useOnlineStatus: Online`
instead of an anonymous `useState: true`. It's cheap enough to add on hooks you expect
other people to consume, and pointless on a one-off hook used in a single file. It also
accepts a second argument, a formatting function, for when the debug value is expensive to
compute — React only calls it when DevTools is actually open and inspecting that hook.

## Why these are all small on purpose

None of `useId`, `useInsertionEffect`, or `useDebugValue` change what your component
renders. They exist because React's rendering model — server/client parity, effect
timing relative to paint, and a devtools story for hooks that hide their state behind a
custom abstraction — created specific, narrow problems that a general-purpose hook
couldn't solve without becoming three different hooks. That's a pattern worth recognizing
across the whole hooks API: when you see a hook with one very specific job, look for the
one very specific problem it was carved out to fix.

## Further reading

- [`useId`](https://react.dev/reference/react/useId) — react.dev
- [`useInsertionEffect`](https://react.dev/reference/react/useInsertionEffect) — react.dev
- [`useDebugValue`](https://react.dev/reference/react/useDebugValue) — react.dev
- [Rendering lists](https://react.dev/learn/rendering-lists#rules-of-keys) — react.dev (why `useId` is not a key)
