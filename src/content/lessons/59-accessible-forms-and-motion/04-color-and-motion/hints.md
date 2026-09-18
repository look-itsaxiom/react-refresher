For `StatusList`, the fix is almost entirely "stop relying only on the dot." Add a visible text
node with the status word inside each `<li>` (a `<strong>` or plain text is fine) — right next to
that job's name, since the two need to read together. Note that the ARIA `listitem` role
prohibits naming (there's no such thing as an accessible name for an `<li>` itself), so this is
about the item's visible text content, not an `aria-label` on the `<li>`.

---

`useReducedMotion` can't call `matchMedia` at all if it's `undefined` — guard every use of it,
both for the initial `useState` value and inside the effect, and return/skip early rather than
throwing. Resolve the "use the parameter, or fall back to `window.matchMedia`, or fall back to
nothing" chain once, near the top of the hook, rather than repeating the fallback logic in two
places.

---

```tsx
const resolvedMatchMedia = matchMedia ?? (typeof window !== 'undefined' ? window.matchMedia : undefined);

const [reduced, setReduced] = useState(() =>
  resolvedMatchMedia ? resolvedMatchMedia('(prefers-reduced-motion: reduce)').matches : false,
);

useEffect(() => {
  if (!resolvedMatchMedia) return;
  const mql = resolvedMatchMedia('(prefers-reduced-motion: reduce)');
  const onChange = () => setReduced(mql.matches);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}, [resolvedMatchMedia]);
```

---

`MediaQueryList` is an `EventTarget`, so `addEventListener('change', handler)` is the modern,
correct subscription (the legacy `addListener`/`removeListener` pair is deprecated). In
`Announcement`, the only wiring left is calling the hook with the prop and mapping its boolean
return to `data-motion="reduced" | "full"` plus swapping which CSS class you apply — the actual
CSS keyframes aren't graded, only the attribute and the hook's behavior.
