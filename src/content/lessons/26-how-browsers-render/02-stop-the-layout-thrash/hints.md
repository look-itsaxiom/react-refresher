Call the starter's `positionItems` once with a fresh `createLayout()` and inspect
`layout.log` (an array of `{ op, index }` in the order operations happened). You'll see
`read, write, read, write, ...` — each `read` after the first sits right after a `write`,
which is exactly what bumps `forcedLayouts`.
---
You don't need the interleaving at all: nothing about reading item `i`'s current position
depends on having already written item `i - 1`'s new position. The two loops are
independent — you can fully separate them.
---
Split `positionItems` into two passes over the same range, `0` to `count - 1`. First pass:
call `layout.read(i)` for every index and collect the results into an array — don't call
`layout.write` yet. Second pass: compute each new value (`current + 4`) from that
collected array and call `layout.write(i, value)` for every index.
---
```ts
export function positionItems(layout: LayoutRecorder, count: number): number[] {
  const currents: number[] = [];
  for (let i = 0; i < count; i++) {
    currents.push(layout.read(i));
  }
  const next = currents.map((current) => current + 4);
  next.forEach((value, i) => layout.write(i, value));
  return next;
}
```
Reads all happen first (only the very first one could ever be a forced layout, and only
if something wrote before this function ran at all), then writes all happen together, so
`forcedLayouts` stays at 0 or 1 no matter how many items there are.
