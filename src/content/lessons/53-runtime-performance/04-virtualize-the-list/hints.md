Work out the *visible* range first, ignoring overscan: `firstVisible` is the index of the
row that contains `scrollTop`, and `lastVisible` is the index of the row that contains
`scrollTop + viewportHeight`. With fixed-height rows, dividing by `rowHeight` and flooring
gets you both.
---
`Math.floor(scrollTop / rowHeight)` gives `firstVisible`. For `lastVisible`, you can either
floor `(scrollTop + viewportHeight) / rowHeight`, or compute how many rows fit
(`Math.ceil(viewportHeight / rowHeight)`) and add that to `firstVisible`, minus one — both
give the same answer for fixed-height rows.
---
Once you have `firstVisible`/`lastVisible`, apply `overscan` on each side and then clamp:
`start = Math.max(0, firstVisible - overscan)`, and `end` (exclusive) is
`Math.min(itemCount, lastVisible + overscan + 1)` — the `+ 1` is what turns an inclusive
last index into an exclusive `end`. `offsetTop` is just `start * rowHeight`, and
`totalHeight` is `itemCount * rowHeight` regardless of the window.
---
```ts
export function computeWindow({
  itemCount,
  rowHeight,
  viewportHeight,
  scrollTop,
  overscan,
}: WindowInput): WindowResult {
  const totalHeight = itemCount * rowHeight;
  if (itemCount <= 0 || rowHeight <= 0) {
    return { start: 0, end: 0, offsetTop: 0, totalHeight: Math.max(0, totalHeight) };
  }

  const safeScrollTop = Math.max(0, scrollTop);
  const firstVisible = Math.floor(safeScrollTop / rowHeight);
  const visibleCount = Math.max(1, Math.ceil(viewportHeight / rowHeight));
  const lastVisible = firstVisible + visibleCount - 1;

  const start = Math.max(0, Math.min(itemCount, firstVisible - overscan));
  const end = Math.max(start, Math.min(itemCount, lastVisible + overscan + 1));
  const offsetTop = start * rowHeight;

  return { start, end, offsetTop, totalHeight };
}
```
The `Math.max(start, ...)` on `end` is what keeps `end` from ever landing below `start`
once both have been clamped — without it, an extreme `overscan` relative to `itemCount`
could produce an inverted range.
