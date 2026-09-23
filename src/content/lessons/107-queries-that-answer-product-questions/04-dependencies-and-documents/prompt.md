# Fix four views over graphs and documents

`query.sql` defines four views over `tasks`, `task_dependencies` (a dependency DAG:
`predecessor_id` must finish before `successor_id` starts), `task_hierarchy` (an
unrelated parent/subtask tree), and `vendor_events` (a `jsonb` payload per event).

Each view has exactly one bug. Fix each one **in place** — keep the view names and
column names exactly as given.

1. **`task_ancestors(task_id, ancestor_id, depth)`** — every ancestor of every task
   in `task_hierarchy`, at every depth (parent, grandparent, ...), not just the
   direct parent.
2. **`ready_tasks(id, title)`** — tasks with `status = 'todo'` where *every*
   predecessor in `task_dependencies` is `done` — including tasks with no
   predecessors at all, which are always ready.
3. **`critical_path(task_id, path, total_minutes)`** — for each task, the *longest*
   predecessor chain leading to it (by summed `estimate_minutes`), as the ordered
   array of task ids in that chain and its total. Task 4 has two paths converging on
   it (the diamond); the view should keep the longer one.
4. **`shipments_by_vendor(vendor, shipments, total_qty)`** — from `vendor_events`,
   counting only events where `payload->>'type' = 'shipment'`, and summing the `qty`
   of every item in each event's `items` array (not the number of items).

Run the file to see each view's current (wrong) output before you touch anything.
