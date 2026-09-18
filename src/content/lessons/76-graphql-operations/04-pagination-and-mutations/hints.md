Start with the two validation checks in `toConnection` — both are one-liners returning
`{ ok: false, error: '...' }` before you touch `items` at all: `first !== undefined &&
last !== undefined`, then `(first ?? 0) < 0` / `(last ?? 0) < 0` guarded by the right
`!== undefined` checks.
---
Build the full edge list once: `let edges = items.map((item) => ({ cursor:
encodeCursor(cursorOf(item)), node: item }))`. Keep it a `let` — you'll reassign it as
you slice.
---
For `after`/`before`, use `findIndex` against the cursor string directly — no decoding
needed, since you're comparing the same `encodeCursor` output on both sides:
```ts
if (after !== undefined) {
  const idx = edges.findIndex((e) => e.cursor === after);
  if (idx !== -1) edges = edges.slice(idx + 1);
}
```
Mirror it for `before` with `slice(0, idx)`.
---
For `first`/`last`, capture `hasNextPage`/`hasPreviousPage` *before* slicing (you need
the pre-slice length to know whether you cut anything off):
```ts
if (first !== undefined) {
  hasNextPage = edges.length > first;
  edges = edges.slice(0, first);
}
```
Then `if (after !== undefined) hasPreviousPage = true;` and the mirror for `before`.
---
For `mergeConnections`, the dedup is one `Set` and one `filter`:
```ts
const existingIds = new Set(existing.edges.map((e) => nodeId(e.node)));
const newEdges = incoming.edges.filter((e) => !existingIds.has(nodeId(e.node)));
```
Then it's just deciding which side's `edges` goes first (`forward`: existing then new;
`backward`: new then existing) and which side's `pageInfo` halves to keep — `forward`
keeps `incoming`'s far-end info (`hasNextPage`/`endCursor`) and `existing`'s near-end
info (`hasPreviousPage`/`startCursor`); `backward` is the mirror image.
---
For `mutationResult`, check `payload.errors` first (top-level, unexpected failure) —
if that's non-empty, you're done, return without looking at `payload.data` at all. Then
guard `payload.data?.result` being missing. Then check `result.userErrors.length > 0`.
Only the final `return` is the success case: `{ ok: true, node: result.node ??
undefined, userErrors: [] }`.
