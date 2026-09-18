All three bugs share one shape: something read during render disagrees
between the server and the client. Fix each one by making the *first* client
render produce exactly what the server produced, then correcting afterward
if needed.

---

For the clock: render `null` (or an empty string) for the time on the first
pass, and call `setTime(...)` from inside a `useEffect` with an empty
dependency array. The effect only runs on the client, after hydration
commits, so it never has to match anything the server rendered.

---

For the id: this is exactly what `useId()` is for. Call it once at the top
of the component and use the string it returns as the `id`. Delete the
`Math.random()` line entirely.

---

For the viewport: `useSyncExternalStore` takes three arguments —
`subscribe(callback)` that wires up a `resize` listener and returns a cleanup
function, `getSnapshot()` that reads the real `window.innerWidth`, and
`getServerSnapshot()` that returns a fixed value (pick `true` for "assume
wide"). Define all three as plain functions outside the component so they
don't change identity on every render. Replace the direct
`window.innerWidth` read with the hook call.

---

Full shape for the viewport fix:

```tsx
function subscribeToResize(onChange: () => void) {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
}
function getClientWidth() {
  return window.innerWidth > 600;
}
function getServerWidthAssumption() {
  return true;
}

// inside Dashboard:
const wide = useSyncExternalStore(subscribeToResize, getClientWidth, getServerWidthAssumption);
```
