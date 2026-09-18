`Children.map` handles the "children can be a single element, an array, or nothing" cases for
you, the same way it does anywhere else in React. Combine it with `isValidElement` to skip
strings/`null`/fragments, and read `child.key` to look the child up in `mapping`.

---

Watch the exact string in `child.key` inside the callback: `Children.map` (and
`Children.forEach`, `Children.toArray`) prefix an explicit key with `.$` internally — a child
created with `key="heading"` shows up as `child.key === ".$heading"` inside the callback. Strip
that prefix before comparing against `mapping`'s plain keys, or every lookup will silently
miss.

---

`cloneElement(child, { slot })` is the only thing that needs to change per matched child —
don't rebuild the whole element, just add the one prop. A child with no entry in `mapping`
(`mapping[child.key]` is `undefined`) should come back exactly as it went in.

---

For `elementProps`, work through the keys in the order the prompt lists the rules: `className`
and `style` first (they're always special-cased regardless of `instance`), then `on*` +
function (event listeners, keyed by the literal remainder — no case conversion), then "does
`instance` have this key at all" (`key in instance`, which is `true` even if the value is
`undefined` there), and only fall into the boolean/string/omit attribute logic last, for
whatever's left.

---

`key in instance` checks own *and* inherited properties, which is what you want — a real custom
element's properties often come from a getter on the prototype, not an own field on the
instance, and `in` covers both. Don't use `Object.hasOwn` here.
