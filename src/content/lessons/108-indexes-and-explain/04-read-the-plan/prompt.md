# Read the plan

## Part 1 — diagnose five captured plans

`plans(id, name, plan)` holds five real `EXPLAIN (ANALYZE)` outputs, captured from a
project-tracking database. For each one, read the plan text in `plans.plan` and classify it.

Create a view named exactly `plan_diagnosis(plan_id, smell, fix)` with one row per plan,
using this fixed vocabulary:

**`smell`** — one of: `seq-scan-large`, `row-estimate-off`, `sort-spill`,
`nested-loop-inner-seq`, `fine`

**`fix`** — one of: `add-index`, `analyze`, `increase-work_mem-or-index`, `rewrite-join`,
`none`

The five plans, by `id`:

1. **assignee lookup, no index** — a `Seq Scan on tasks` filtering `assignee_id = 42` against
   a 4,000,041-row table, removing nearly 4 million rows to keep 41.
2. **projects by org, stale stats** — an `Index Scan` estimates 1 row, actually returns
   6,210, right after a bulk import.
3. **monthly report, order by total** — a `Sort` node reports `Sort Method: external merge
   Disk: 8624kB` above a `Seq Scan on invoices`.
4. **tasks per project, one query per project** — a `Nested Loop` calls a `Seq Scan on tasks`
   240 times (`loops=240`), each time filtering `project_id = projects.id` and discarding
   ~19,759 rows, because the query issues one lookup per project instead of one batched
   query.
5. **overdue tasks, already indexed** — a `Bitmap Heap Scan` using an existing composite
   index, estimated 17 rows, actual 16, sub-millisecond.

Query `select * from plans order by id` in the preview to read the full text of each plan.

## Part 2 — index a jsonb column and query through it

`vendor_events(id, payload jsonb)` has 20,000 rows; `payload` looks like
`{"vendor": "v37", "amount": 412}`.

1. Add a GIN index on `payload` (any name).
2. Create a function `jsonb_events_by_vendor(v text) returns setof int` that returns the
   `id`s of every event whose `payload` contains `{"vendor": v}`, using `@>` containment —
   not `payload->>'vendor' = v`, which the GIN index can't serve.
