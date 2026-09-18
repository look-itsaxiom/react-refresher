Start with `flattenStyle`. It's a `reduce` over an array (wrap a single
object in a one-element array first): skip falsy entries with a guard,
and merge the rest with `Object.assign` or object spread, in order, so a
later entry's properties overwrite an earlier entry's same-named
properties.

---

`View`'s layout defaults and the caller's style aren't in competition —
apply the defaults first, then spread the flattened caller style on top
of them in the same object, so a caller who does pass `flexDirection` (or
anything else) wins. For the raw-text check, `children` might be a single
node or an array — normalize it into an array first (`Array.isArray(...)
? children : [children]`) and check each entry's `typeof` for `'string'`
or `'number'`.

---

`Pressable`'s `style` and `children` props are each either a plain value
or a function of `{ pressed }` — resolve both the same way: `typeof x ===
'function' ? x(state) : x`. Track `pressed` with `useState`, flipping it
`true` on `onPointerDown` and back to `false` on both `onPointerUp` *and*
`onPointerLeave` (a real touch can end by sliding off the button, not
just releasing on it).

---

`usePlatform`'s `select` doesn't need a loop — a handful of `if`
statements checking `OS` against each key, each returning immediately
when there's a match, with `spec.default` as the final fallback, reads
more clearly than a generic lookup for four fixed keys.

---

Full shape:

```tsx
export function flattenStyle(style) {
  const list = Array.isArray(style) ? style : [style];
  const result = {};
  for (const entry of list) if (entry) Object.assign(result, entry);
  return result;
}

export function View({ style, children, ...rest }) {
  for (const child of Array.isArray(children) ? children : [children]) {
    if (typeof child === 'string' || typeof child === 'number') {
      throw new Error('Text string must be rendered within a <Text> component.');
    }
  }
  const merged = { display: 'flex', flexDirection: 'column', boxSizing: 'border-box', ...flattenStyle(style) };
  return <div style={merged} {...rest}>{children}</div>;
}

export function usePlatform() {
  const OS = useContext(PlatformContext);
  function select(spec) {
    if (OS === 'ios' && spec.ios !== undefined) return spec.ios;
    if (OS === 'android' && spec.android !== undefined) return spec.android;
    if (OS === 'web' && spec.web !== undefined) return spec.web;
    return spec.default;
  }
  return { OS, select };
}
```
