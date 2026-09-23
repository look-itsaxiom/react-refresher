`task_ancestors` has no `WITH RECURSIVE` at all — it's a single pass over
`task_hierarchy` that only ever looks at `parent_id` directly, so it can't reach a
grandparent. Turn it into a recursive CTE: base case is the direct parent (depth 1),
recursive term joins `task_hierarchy` again on the *previous* ancestor's `parent_id`
and increments depth, stopping when `parent_id is null`.

---

`ready_tasks`'s `EXISTS` only proves "at least one predecessor is done," which is a
different claim than "all predecessors are done" — and it also has no way to say yes
for a task with zero predecessors, since `EXISTS` over zero rows is always false.
Flip it: use `NOT EXISTS (... predecessor that is NOT done ...)`. A task with no
predecessor rows at all then automatically passes, because there's nothing for the
`NOT EXISTS` to find.

---

`critical_path` is otherwise correct recursive-CTE machinery — the bug is just the
sort direction picking the ranked row. `total_minutes asc` keeps the *shortest*
chain to each task; change it to `desc` so the longest one survives the
`row_number() ... where rn = 1` filter. Check task 4 specifically: it should end up
with `path = [1, 2, 4]` (120 minutes), not `[1, 3, 4]` (90 minutes).

---

`shipments_by_vendor` has two independent problems. First, nothing filters on
`payload->>'type'`, so a non-shipment event (a `'note'`, here) gets counted as one —
add `where payload ->> 'type' = 'shipment'`. Second, `jsonb_array_length(...)` counts
how many elements are in the `items` array, not what's inside them. Unnest the array
with `jsonb_array_elements(payload -> 'items')` (a `LATERAL` subquery or a second
`FROM` item both work) and `sum((item ->> 'qty')::int)` across the unnested rows.
