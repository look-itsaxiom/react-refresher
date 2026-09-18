Keep `preference` and `resolved` as two separate `useState`s. `preference` only changes
from `setPreference` (or the initial read from storage); `resolved` changes from either
`preference` changing or a `matchMedia` `'change'` event firing while `preference` is
`'system'`.

---

Compute the initial `preference` with a lazy `useState` initializer
(`useState(() => ...)`) so `storage.getItem` only runs once, on mount, not on every
render.

---

The subscribe/unsubscribe logic belongs in a `useEffect` keyed on `[preference,
matchMedia]`. Inside it: if `preference !== 'system'`, just set `resolved` to `preference`
and return (no listener needed). If it is `'system'`, call `matchMedia(...)` once to get
the current value and set `resolved`, then `addEventListener('change', handler)` and
return a cleanup function that calls `removeEventListener`.

---

`setPreference` doesn't need to compute `resolved` itself — let the `useEffect` above
react to the `preference` state change and derive `resolved` from it. Keeping "write
preference" and "derive resolved" in two different places (an event handler vs. an
effect) is what makes the system-preference live-update case (hint below) work without
extra code.

---

For the "outside a provider" throw, check what `useContext` returns before assuming it's
present — a context created with `createContext<T | null>(null)` returns `null` when
there's no matching `<Provider>` above it in the tree. `if (ctx === null) throw new
Error(...)`.

---

`noFlashScript` is a plain function returning a string — don't try to make it JSX or a
component. Use `JSON.stringify(storageKey)` when interpolating the key into the script
text, so it's safely quoted, and keep the fallback logic (stored value → matchMedia) as
literal JS text inside that string, mirroring what `ThemeProvider` does at runtime.
