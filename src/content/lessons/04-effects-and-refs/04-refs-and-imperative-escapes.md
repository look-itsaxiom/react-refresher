# Refs: mutable values, DOM nodes, and imperative escapes

State and refs both hold onto a value between renders. The difference is what happens when you change one: `setState` schedules a re-render; mutating `ref.current` does not. That single distinction is the whole model. Reach for a ref when a value needs to persist but a re-render would be wasted or wrong — a timer ID, a previous value for comparison, a WebSocket instance, a DOM node.

## `useRef` for values that don't drive rendering

```tsx
function StopwatchButton() {
  const startedAt = useRef<number | null>(null);

  function handleStart() {
    startedAt.current = performance.now(); // no re-render, and that's correct
  }
  // ...
}
```

`startedAt` needs to be readable across renders and across event handlers, but nothing on screen depends on it directly, so state would just cause pointless re-renders. Never read or write `ref.current` during render itself (that reintroduces the purity problem from the first step of this lesson) — refs are for effects and event handlers, not the render body.

## Refs to DOM nodes, and ref as a prop in React 19

The other common use is holding a reference to an actual DOM element:

```tsx
function SearchBox() {
  const inputRef = useRef<HTMLInputElement>(null);
  return <input ref={inputRef} onFocus={() => inputRef.current?.select()} />;
}
```

React attaches the node to `inputRef.current` after commit and clears it to `null` before the node is removed. As of React 19, `ref` works as an ordinary prop on function components — you can accept `ref` directly in a component's props and it flows through like any other prop, without wrapping the component in `forwardRef`. `forwardRef` still works for existing code, but new components don't need it.

```tsx
function TextInput({ ref, ...props }: { ref?: React.Ref<HTMLInputElement> } & JSX.IntrinsicElements['input']) {
  return <input ref={ref} {...props} />;
}
```

## Ref callbacks can clean up after themselves

Instead of a ref object, you can pass a function; React calls it with the node when it attaches. React 19 added the ability for that callback to **return a cleanup function**, which React calls when the node is about to be detached or the component unmounts:

```tsx
<div
  ref={(node) => {
    if (!node) return;
    const observer = new ResizeObserver(onResize);
    observer.observe(node);
    return () => observer.disconnect(); // new in React 19
  }}
/>
```

Before this, ref callbacks were called with `null` on teardown and you had to store the observer somewhere else (usually another ref) to disconnect it. The cleanup-function form gives ref callbacks the same shape as effects: set up, and hand back how to tear down, in one place.

## `useImperativeHandle`, sparingly

Occasionally a parent needs to *do* something to a child imperatively — focus it, scroll it into view, trigger an animation — rather than just re-render it with new props. `useImperativeHandle` lets a component expose a narrow, deliberate API on its ref instead of the raw DOM node:

```tsx
function FancyInput({ ref }: { ref?: React.Ref<{ focus(): void }> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    focus() {
      inputRef.current?.focus();
    },
  }));
  return <input ref={inputRef} />;
}
```

The parent gets `focus()` and nothing else — not the raw `<input>`, not the ability to read its value directly. This is a genuine escape hatch, not a default: most parent/child communication should still flow through props and callbacks. Reach for it when a small set of imperative operations is the *entire* contract you want to expose, and no more.

## Further reading (optional)

- [Manipulating the DOM with Refs](https://react.dev/learn/manipulating-the-dom-with-refs)
- [`useRef`](https://react.dev/reference/react/useRef)
- [`useImperativeHandle`](https://react.dev/reference/react/useImperativeHandle)
- [React DOM Elements — ref callback](https://react.dev/reference/react-dom/components/common#ref-callback)
