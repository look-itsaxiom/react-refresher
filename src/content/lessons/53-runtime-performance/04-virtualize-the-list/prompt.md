# Virtualize the list

`VirtualList` renders 1,000 rows through a fixed-height, scrollable viewport, but
`computeWindow` — the pure function that decides which rows to actually mount — is
wrong: it always returns the entire list, so every row renders regardless of scroll
position. That defeats the point; a 400px-tall viewport showing 40px rows only ever needs
about 10 of them mounted at once.

Fix `computeWindow({ itemCount, rowHeight, viewportHeight, scrollTop, overscan })` so it
returns:

- `start` / `end` — the index range to render, as `end` **exclusive** (so
  `items.slice(start, end)` is exactly what should mount). Include `overscan` extra rows
  on each side of what's strictly visible, but clamp both to `[0, itemCount]` — never
  return a negative `start` or an `end` past the last item.
- `offsetTop` — `start * rowHeight`, the pixel offset of the first *rendered* row, used to
  position the rendered rows correctly inside the full-height spacer.
- `totalHeight` — `itemCount * rowHeight`, the full scrollable height the spacer should
  report regardless of how few rows are actually mounted.

An item is "visible" if any part of it falls within `[scrollTop, scrollTop +
viewportHeight)`. `VirtualList` itself is already wired up correctly — it stores
`scrollTop` from the container's `onScroll` handler and renders exactly
`items.slice(start, end)` positioned at `offsetTop`; you shouldn't need to touch it.

`ITEM_COUNT`, `ROW_HEIGHT`, `VIEWPORT_HEIGHT`, and `OVERSCAN` are provided — don't change
them; the checks depend on their exact values (1000, 40, 400, 3).
