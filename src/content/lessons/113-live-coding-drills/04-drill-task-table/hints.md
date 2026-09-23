Don't measure the container with `getBoundingClientRect` or `clientHeight` — that's fragile
even in a real browser during the first paint, and useless in the sandbox's test environment.
Pick a fixed `VIEWPORT_HEIGHT` and `ROW_HEIGHT` as constants, set the scroll container's CSS
height to `VIEWPORT_HEIGHT`, and compute the visible slice purely from `scrollTop`, those two
constants, and an overscan count.

---

`startIndex = Math.floor(scrollTop / ROW_HEIGHT)`, then subtract your overscan and clamp to 0.
`endIndex = startIndex + visibleRowCount + overscan * 2`, clamped to the array length. Slice
the sorted-and-filtered array with those two indexes. Use two spacer elements (empty divs
sized `startIndex * ROW_HEIGHT` and `(total - endIndex) * ROW_HEIGHT`) above and below the
rendered rows so the scrollbar's total height stays correct without every row existing.

---

`useDeferredValue(filter)` gives you a value that lags behind `filter` under load — filter the
*rows* on the deferred value, but keep the `<input>`'s `value` bound to the *immediate* `filter`
state so typing itself never stalls. Recompute the filtered-and-sorted array in a `useMemo`
keyed on `[rows, deferredFilter, sortKey, sortDir]` so an unrelated render doesn't redo the
work.

---

For `aria-sort`, store `sortKey` and `sortDir` in state. A column's `aria-sort` is `"none"`
unless it's the active `sortKey`, in which case it's `"ascending"` or `"descending"` based on
`sortDir`. Clicking the already-active column flips `sortDir`; clicking a different column
sets it as the new `sortKey` with `sortDir` reset to `"asc"`.
