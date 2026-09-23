# Refs in React 19: `forwardRef`'s retirement and cleanup callbacks that actually clean up

The previous lesson introduced ref-as-prop and ref callback cleanup in passing. This one covers what actually changed under the hood, and the mistakes those changes make newly possible.

## `forwardRef` is deprecated, not removed

React 19's own docs say it plainly: "In React 19, `forwardRef` is no longer necessary. Pass `ref` as a prop instead. `forwardRef` will be deprecated in a future release." As of 19.3 it still works — this is a deprecation notice, not a removal, and there's no codemod deadline yet — but new components should be written the plain way:

```tsx
// Before: every component that could receive a ref needed this wrapper
const TextField = forwardRef<HTMLInputElement, Props>(function TextField(props, ref) {
  return <input ref={ref} {...props} />;
});

// React 19: ref is just a prop
function TextField({ ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />;
}
```

Two things fall out of this. First, `ref` is no longer special-cased out of your props object — a component with `ref` in its type signature can read it, destructure it, pass it along, exactly like `className` or `onClick`. Second, generic components benefit the most: `forwardRef`'s type signature (`forwardRef<RefType, PropsType>`) fought with component-level generics often enough that plenty of teams gave up and used `any`. A plain function component keeps whatever generics it already had.

If you're maintaining code that still uses `forwardRef`, there's no urgency to convert it — it isn't broken and won't be until a major version React hasn't announced a date for makes an explicit removal. Convert it when you're already touching the file, not as a standalone migration project.

## Ref callback cleanup, and the caveat that makes it necessary to get right

You've seen the shape: return a function from a ref callback and React calls it on teardown instead of calling the callback again with `null`.

```tsx
<div
  ref={(node) => {
    if (!node) return;
    const observer = new ResizeObserver(onResize);
    observer.observe(node);
    return () => observer.disconnect();
  }}
/>
```

The part that doesn't show up in a three-line example: **React treats a ref callback like an effect with a dependency array of "the function's identity."** If you pass a *new* function on every render — which an inline arrow function is, always — React tears down and re-runs it on every single render, not just mount and unmount. Attach a `ResizeObserver` this way and you get a fresh observer disconnected-and-recreated on every render of the parent, which is wasted work at best and, if the observer's setup has side effects that aren't perfectly idempotent (starting a network subscription, incrementing an external counter), a real bug.

The fix is the same one you already know from `useEffect`'s dependency array and from memoizing event handlers: give the ref callback a stable identity.

```tsx
const attachObserver = useCallback((node: HTMLDivElement | null) => {
  if (!node) return;
  const observer = new ResizeObserver(onResize);
  observer.observe(node);
  return () => observer.disconnect();
}, [onResize]);

<div ref={attachObserver} />
```

Now the callback only re-fires when `onResize`'s identity actually changes, matching how you'd already guard a `useEffect` that depends on it. `useRef` objects (`<div ref={someRef} />`) don't have this problem — a ref object's identity is stable for the life of the component, which is one more reason the plain `useRef` form remains the default choice, reaching for a callback only when you need the attach/detach moments themselves (observers, manual measurement, imperative libraries that mount onto a node).

The other backward-compatibility detail worth knowing: if your ref callback doesn't return a cleanup function, React keeps the old behavior and calls it with `null` before detaching — but that fallback is explicitly called out as something a future version will remove. Any new ref callback that does setup should return matching cleanup, the same discipline as writing an effect with no missing teardown.

## Refs cannot be read or written during render

This isn't new to React 19, but the React Compiler (on by default for buildable code since the 19.x line) now catches it at build time instead of leaving it as a runtime footgun: reading or writing `ref.current` while a component is rendering is forbidden, and the compiler's lint rule flags it. Refs exist specifically for values that live *outside* the render/re-render cycle; reading one during render makes the component's output depend on something React has no way to know changed, which breaks the assumption the Compiler's memoization relies on (and broke `<StrictMode>`'s double-render guarantees long before the Compiler existed).

```tsx
function Bad() {
  const countRef = useRef(0);
  countRef.current++; // ❌ mutating during render
  return <p>{countRef.current}</p>;
}
```

The two places refs are supposed to be touched are event handlers and effects — both run outside of render, after React has already decided what to commit. If you find yourself wanting a ref's value *in* the JSX a component returns, that's usually a sign the value belongs in state instead, or that you're solving a "the value doesn't need to trigger a re-render" problem incorrectly by reading it from the wrong place rather than the wrong mechanism.

## `useImperativeHandle`, still sparingly

Nothing about `useImperativeHandle` itself changed in React 19 beyond no longer needing `forwardRef` around it. It's still the tool for exposing a narrow, deliberate imperative API — `focus()`, `scrollIntoView()`, `reset()` — instead of the raw node, and it's still meant to be the exception: most parent/child communication should be props down, callbacks up. Reach for it when the *entire* contract you want to expose to a caller is "do this one imperative thing," not as a general escape from designing a props API.

## Further reading (optional)

- [React 19: ref as a prop](https://react.dev/blog/2024/04/25/react-19#ref-as-a-prop) — react.dev
- [`forwardRef` reference — deprecation note](https://react.dev/reference/react/forwardRef) — react.dev
- [`ref` callback — React DOM common components](https://react.dev/reference/react-dom/components/common#ref-callback) — react.dev
- [`useImperativeHandle` reference](https://react.dev/reference/react/useImperativeHandle) — react.dev
