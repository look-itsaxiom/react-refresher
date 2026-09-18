A `role="search"` landmark is usually just a wrapping element: `<div role="search">...</div>` (or
a `<form role="search">` if you'd rather submit on Enter). It doesn't need a name of its own —
only the input inside it does.

---

A visually-hidden label still counts as a real accessible name and is the more robust choice over
`aria-label` when you want the label to also work for sighted users who zoom or use a screen
magnifier:

```tsx
<label htmlFor="task-search" className="sr-only">Search tasks</label>
<input id="task-search" type="search" value={query} onChange={...} />
```

(`aria-label="Search tasks"` directly on the `<input>` is a perfectly valid shortcut if you don't
want to add a visible-but-hidden label element.)

---

Swap each filter `<div onClick={...}>` for a `<button type="button" onClick={...} aria-pressed={filter === 'active'}>Active</button>`
— the `type="button"` matters inside any surrounding `<form>` so it doesn't accidentally submit.

---

For the live region, the simplest fix is adding one attribute to the element that already renders
the count: `<p aria-live="polite">{results.length} results</p>`. No extra wrapper needed.

---

Nothing about the filtering logic (the `.filter(...)` calls, the `results` array, the `ITEMS`
data) needs to change — every fix here is markup and attributes on the elements that already
exist.
