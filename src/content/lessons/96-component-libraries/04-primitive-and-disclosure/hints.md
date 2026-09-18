Write `mergeProps` as a fold: start with an empty `result` object, and for each props
object in order, walk its keys. For a key you've already partially built up in `result`
(from an earlier object), you need to combine rather than overwrite for `className`,
`style`, and `on*` handler keys — everything else just overwrites, but only when the new
value isn't `undefined`.

---

A minimal handler-composition helper, inlined per key:

```ts
if (/^on[A-Z]/.test(key) && typeof value === 'function') {
  const existing = result[key];
  result[key] = typeof existing === 'function'
    ? (...args: unknown[]) => {
        (existing as (...a: unknown[]) => void)(...args);
        (value as (...a: unknown[]) => void)(...args);
      }
    : value;
}
```

Because you process objects in argument order and always call `existing` (the
already-composed handler from earlier objects) before `value` (the new one), the
earliest object's handler always ends up running first.

---

For `Disclosure.Trigger` and `Disclosure.Content`, resolve a function-form `className`
*before* it reaches `mergeProps` — `mergeProps` only knows how to concatenate strings.
Something like:

```ts
const resolvedClassName = typeof className === 'function' ? className({ open }) : className;
```

then pass `resolvedClassName` into the internal props object you merge with `rest`.

---

`forceMount` changes *whether the element stays in the DOM*, not just its visibility —
that's the difference between conditionally returning `null` and always rendering with a
`hidden` boolean attribute. Reuse the `hidden` prop React already understands on host
elements (`<div hidden={!open}>`), don't reach for inline styles.

---

`Portal` is the shortest piece: `createPortal(children, container ?? document.body)`,
returned straight from the component. No `useEffect` needed for this exercise — jsdom
supports portalling into `document.body` synchronously during render.
