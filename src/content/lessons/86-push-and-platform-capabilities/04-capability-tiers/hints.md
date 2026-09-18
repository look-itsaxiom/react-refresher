Build a small ordered list of `{ key, test }` pairs — one per capability — and derive both
`available` and `missing` by filtering it once. That keeps the five checks in one place
instead of five separate `if` blocks that can drift out of sync with the table.

---

Compute `available` and `missing` *before* deciding `tier` — the tier rule for the installed
branch reads `available.length`, so it depends on that list already being final.

---

The three manifest hints are independent of each other and independent of `tier` — check all
three every time, in the order listed in the prompt, and only skip one if its specific
condition is false. Don't `return` early after the first match.

---

For `shareOrCopy`, `canShare` can exist and still return `false` for a given payload (e.g. it
supports text but not the `files` you're passing) — check its return value, not just whether
the function exists, before calling `share`.

---

Wrap the `share(data)` call in `try/catch` (or `.catch`), inspect `err.name === 'AbortError'`
in the catch, and re-throw anything else — a real share can fail for other reasons, and this
function should only special-case cancellation.

```ts
try {
  await platform.navigator.share(data);
  return 'shared';
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
  throw err;
}
```
