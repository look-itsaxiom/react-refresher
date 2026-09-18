Watch the `data-renders` attribute on `Chart` in the preview while you type in the filter
box. It climbs on every keystroke even though `Chart`'s own prop (`data={ROWS}`, the same
array every time) never changes. The problem isn't `Chart`'s props — it's that `Chart` is
a child of the component holding the state that's changing.

---

Move the `filter` state (and the `<input>`) into a new component, say `FilterPanel`, that
takes `children`. Render `<Chart data={ROWS} />` inside `Dashboard`, and pass it to
`FilterPanel` as `children`: `<FilterPanel><Chart data={ROWS} /></FilterPanel>`. `Dashboard`
itself now has no state and never re-renders after mount, so the `<Chart />` element it
created is the same element on every check — `FilterPanel` re-rendering internally doesn't
touch it.

---

`Table` still needs the filtered rows, so it has to live inside `FilterPanel` (or receive
filtered rows some other way) — it's supposed to update as you type, just not on literally
every keystroke. Wrap the filter text in `useDeferredValue` and filter using the deferred
value: `const deferredFilter = useDeferredValue(filter)`. Keep the `<input>`'s `value`
bound to the raw `filter` state, not the deferred one, so typing itself never lags.

---

`useDeferredValue` on its own only reduces how often *that value* changes — it doesn't
stop `Table` from re-rendering for other reasons. `FilterPanel` still re-renders on every
keystroke (to update the input), and an unmemoized `Table` re-renders whenever its parent
does, regardless of whether `rows` actually changed. Two more pieces: wrap `Table` itself
in `React.memo`, and compute `filtered` with `useMemo(() => ROWS.filter(...), [deferredFilter])`
so it's the *same* array reference across renders where `deferredFilter` hasn't changed —
otherwise `React.memo`'s prop comparison sees a "new" array every time and re-renders
anyway.
