# Stop the cascade

`Dashboard` renders a filter input, a `Chart`, and a `Table`. Typing in the filter box
re-renders **both** `Chart` and `Table` on every keystroke, even though `Chart` never
looks at the filter text at all — it always summarizes the full, unfiltered data set.

Each heavy component tracks its own render count in a `data-renders` attribute, so you
can watch the problem happen in the preview.

Fix it with three changes, in this order of leverage:

1. **Colocate the filter state.** Move the `filter` state (and the input that owns it)
   into its own component instead of leaving it in `Dashboard`. `Dashboard` itself should
   end up not needing any state at all.
2. **Pass `Chart` down as `children`**, created once by the stable `Dashboard`, instead of
   rendering it inside the component that owns the filter state. An element passed as
   `children` keeps its identity across its parent's re-renders — React won't re-render it
   just because the component holding it re-rendered for an unrelated reason.
3. **Wrap the value `Table` depends on in `useDeferredValue`, and make that fix actually
   stick.** `Table` does need to react to the filter text (unlike `Chart`), but it doesn't
   need to re-render on every single keystroke — deferring the value it reads lets React
   coalesce rapid updates into fewer commits. Deferring alone isn't enough, though: if the
   filtered array is rebuilt as a fresh reference on every render regardless, and `Table`
   isn't guarded by `React.memo`, `Table` still re-renders every time its parent does. Wrap
   `Table` in `React.memo`, and memoize the filtered array itself (`useMemo`, keyed on the
   *deferred* filter value) so an unrelated re-render doesn't hand `Table` a "new" array it
   has to treat as changed.

Don't change what `Chart` or `Table` render, and don't remove their `data-renders`
counters — the checks (and the preview) rely on them.
