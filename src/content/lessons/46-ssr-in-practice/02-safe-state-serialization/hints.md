Wrap the value once, at the top: `JSON.stringify({ __root: value }, replacer)`. Stringifying a wrapper object instead of `value` directly sidesteps every edge case where `value` itself is `undefined` or a top-level `Date`/`Map`/`Set`/`bigint` — `JSON.stringify` can't handle those as its *root* argument even with a replacer, but it handles them fine as a property of an object.

---

For the type tagging, write one `replacer(key, val)` function passed as the second argument to `JSON.stringify`: check `val instanceof Date`, `val instanceof Map`, `val instanceof Set`, `typeof val === 'bigint'`, and `val === undefined`, and for each return a small tagged object like `{ __t: 'date', v: val.toISOString() }`. Return `val` unchanged otherwise. `JSON.stringify` calls the replacer recursively on whatever you return, so nesting (a `Date` inside a `Map`'s values) resolves itself — you don't need to recurse manually.

---

For escaping, don't hand-roll unescaping later — use JSON's own `\uXXXX` escape syntax, which `JSON.parse` already decodes. After `JSON.stringify` produces plain text, do `.replace(/</g, '\\u003C').replace(/>/g, '\\u003E').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')` on the *whole string* — these characters can only occur inside JSON string values (JSON's own punctuation never uses them), so a blanket replace is safe, and `JSON.parse` on the result decodes the `\u003C` sequences back to `<` automatically as part of normal JSON string parsing.

---

For `deserializeState`, pass a reviver to `JSON.parse` that reverses the tagging (`{ __t: 'date', v }` → `new Date(v)`, `{ __t: 'map', v }` → `new Map(v)`, etc.), then return `parsed.__root`. The reviver runs bottom-up automatically, so a `Date` nested inside a `Map`'s entries is already a real `Date` by the time you construct the `Map`.

---

`renderWithState` and `bootFromDocument` are the easy half once serialization works: `renderToString(createElement(Component, { state }))` for the markup, and on the boot side, `document.getElementById('app-state')?.textContent` to get the payload back before calling `hydrateRoot`.
