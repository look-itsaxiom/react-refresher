Build the view as a `union all` of one `select` per plan, each producing the three columns
in order: `plan_id`, `smell`, `fix`. You don't need to read `plans.plan` with SQL string
matching — read it with your eyes in the preview and hand-write the diagnosis.

---

Plan 1 removes nearly 4 million rows out of ~4,000,041 to keep 41 — a huge, unindexed
equality filter on a big table. Plan 5's `Bitmap Heap Scan` estimated 17, got 16, and ran in
under a millisecond — nothing to fix there.

---

Plan 2's scan type is already right (`Index Scan`), but its row estimate is off by three
orders of magnitude right after a bulk import — that's a statistics problem, not a plan-shape
problem.

---

Plan 3's giveaway is the literal text `Sort Method: external merge` with a `Disk:` size — the
sort spilled to temp files because it didn't fit in `work_mem`.

---

Plan 4's giveaway is `loops=240` on the inner `Seq Scan` — the same scan re-run once per
outer row instead of one batched query. That's the N+1 pattern from the database side.

---

For Part 2, `payload @> jsonb_build_object('vendor', v)` (or `payload @> jsonb_build_object('vendor', v)::jsonb`) is what the GIN index on `payload` can use as an index
condition; a `language sql stable` function body is a single `select`, no `return` keyword.

---

Full solution shape:

```sql
create view plan_diagnosis (plan_id, smell, fix) as
select 1, 'seq-scan-large', 'add-index'
union all select 2, 'row-estimate-off', 'analyze'
union all select 3, 'sort-spill', 'increase-work_mem-or-index'
union all select 4, 'nested-loop-inner-seq', 'rewrite-join'
union all select 5, 'fine', 'none';

create index idx_vendor_events_payload on vendor_events using gin (payload);

create function jsonb_events_by_vendor(v text) returns setof int as $$
  select id from vendor_events where payload @> jsonb_build_object('vendor', v)
$$ language sql stable;
```
