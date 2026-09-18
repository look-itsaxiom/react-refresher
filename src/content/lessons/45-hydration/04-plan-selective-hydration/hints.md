Split `planHydration` into two groups and concatenate them: the "jumped the
queue" group first, then the "priority order" group. Don't try to sort
everything in one pass with a single comparator — the interaction group
isn't sorted by anything, it just preserves interaction order.

---

Build the interacted group by walking `interactions` in order and pushing an
id the first time you see it, but only if that boundary is actually
`ready`. A `Set` is the easiest way to dedupe and to check "already added."

---

Build the "rest" group from `boundaries.filter(...)`, not from
`readyIds` directly — you need each boundary's `priority`, not just its id,
and you need to exclude both not-ready boundaries and ones already placed in
the interacted group. Sort that filtered array by `priority` ascending;
`Array.prototype.sort` is stable in every JS engine you'll run this in, so
ties keep their original relative order for free.

---

For `replayEvents`, don't try to sort `queuedEvents` directly by looking up
each event's index in `order` — build a `Map<string, QueuedEvent[]>`
grouping the queued events by `boundaryId` first (skipping any boundary not
present in `order`), then walk `order` and push each boundary's whole bucket
in one go. That gets you "grouped by boundary, boundaries in `order`'s
sequence, each boundary's own events in their original relative order" in
one pass over each structure.
