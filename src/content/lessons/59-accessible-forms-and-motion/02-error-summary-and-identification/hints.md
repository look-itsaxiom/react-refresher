Track which fields currently have an error with `FIELDS.filter((f) => errors[f.key])` — that's
both your summary list and the thing you check to decide whether to focus the summary at all.
You'll also need a counter (or any changing value) for "a submit was just attempted," separate
from `errors` itself, so you don't re-focus the summary on every render where errors happen to be
non-empty.

---

Focusing an element that was *just* rendered has to happen after the DOM commits, not inside the
submit handler itself — the summary heading doesn't exist yet at the point `handleSubmit` runs.
Reach for `useEffect` keyed on both "a submit attempt happened" and "there are errors," with a
`ref` on the heading.

---

```tsx
const [attempt, setAttempt] = useState(0);
const summaryHeadingRef = useRef<HTMLHeadingElement>(null);

useEffect(() => {
  if (attempt > 0 && hasErrors) {
    summaryHeadingRef.current?.focus();
  }
}, [attempt, hasErrors]);
```

Bump `attempt` in `handleSubmit` alongside `setErrors`.

---

For the links: `href="#field-id"` is enough for a mouse click to look right, but the check (and a
real screen reader user) needs actual focus, which the browser's hash navigation does not
reliably give an `<input>`. Handle the click yourself:

```tsx
<a
  href={`#${f.key}`}
  onClick={(e) => {
    e.preventDefault();
    document.getElementById(f.key)?.focus();
  }}
>
  {errors[f.key]}
</a>
```

---

Required text and `autocomplete` are the easy, easy-to-forget part: add a visible
`<span>(Required)</span>` next to each label (or in the `<legend>`/heading if you group fields),
`aria-required="true"` on each input, and `autoComplete="name"` / `autoComplete="email"` on the
name and email inputs specifically — the token names are lowercase-hyphenated HTML spec values,
not free text.
