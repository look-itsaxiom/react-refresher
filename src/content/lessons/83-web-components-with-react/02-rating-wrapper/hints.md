`value` and `max` are already landing on the element as real properties — React 19 does that
automatically because `XRatingElement` defines matching `value`/`max` properties. The missing
piece is the event and the imperative handle, not the controlled prop wiring.

---

Keep a plain `useRef<XRatingElement | null>(null)` inside `Rating` and attach it with a ref
callback passed to `createElement`'s options: `ref: (node) => { elRef.current = node; }`.
Custom elements are host elements, so a ref callback there has always worked, React 19 or not.

---

`useImperativeHandle(ref, () => ({ reset() { elRef.current?.reset(); } }))` — the factory
function runs after every render where `ref` or your dependency array changes, so you can read
`elRef.current` fresh inside it without an extra dependency array argument.

---

For the listener: `useEffect(() => { const el = elRef.current; if (!el || !onChange) return;
function handler(e) { onChange(e.detail.value); } el.addEventListener('rating-change',
handler); return () => el.removeEventListener('rating-change', handler); }, [onChange]);`. The
returned function is exactly what runs on unmount and before the effect re-runs — that's your
cleanup.
