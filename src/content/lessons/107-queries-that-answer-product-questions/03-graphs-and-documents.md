# Graphs and documents

Two shapes come up constantly in project-management data and don't fit the
join-and-aggregate toolkit from the last step: self-referencing hierarchies (a task's
subtasks, an org chart) and dependency graphs (task A can't start until task B
finishes). Both need recursive CTEs. This step also covers `jsonb`, for the
half-structured payloads a vendor integration hands you that don't deserve their own
normalized tables.

## Recursive CTEs: the shape

A recursive CTE has two parts joined by `UNION ALL`: a **base case** (the starting
rows) and a **recursive term** (a query that references the CTE's own name, run
repeatedly until it returns no new rows).

```sql
with recursive subtasks as (
  -- base case: the task itself
  select id, parent_id, title, 0 as depth
  from tasks
  where id = 42

  union all

  -- recursive term: children of anything already in subtasks
  select t.id, t.parent_id, t.title, s.depth + 1
  from tasks t
  join subtasks s on t.parent_id = s.id
)
select * from subtasks order by depth, id;
```

Each iteration runs the recursive term against only the rows the *previous*
iteration added, not the whole accumulated set — that's what makes it terminate
instead of reprocessing the same rows forever. It stops when an iteration produces
zero rows.

## Cycle protection

A hierarchy that's supposed to be a tree can still have bad data — a task
accidentally set as its own ancestor — and a naive recursive CTE on a cyclic graph
loops until it errors out or exhausts memory. Two defenses:

**Path array.** Carry the chain of visited ids and check membership before
recursing:

```sql
with recursive subtasks as (
  select id, parent_id, array[id] as path
  from tasks where id = 42
  union all
  select t.id, t.parent_id, s.path || t.id
  from tasks t
  join subtasks s on t.parent_id = s.id
  where not t.id = any(s.path)  -- stop before re-entering a visited node
)
select * from subtasks;
```

**`CYCLE` clause (Postgres 14+).** Standard SQL syntax that does the same
bookkeeping for you: `CYCLE <col> SET <flag> USING <path>` tracks the path
internally and sets a boolean column when a row would revisit one already seen,
instead of you managing the array by hand:

```sql
with recursive subtasks as (
  select id, parent_id from tasks where id = 42
  union all
  select t.id, t.parent_id from tasks t join subtasks s on t.parent_id = s.id
) cycle id set is_cycle using path
select * from subtasks where not is_cycle;
```

Prefer `CYCLE` when your Postgres version has it — it's less code and less room to
get the path check wrong. The path-array form is the portable fallback and also
doubles as the answer itself when the *path* is the thing you need (see the
critical-path query below).

## Dependency graphs: ready-to-start and transitive predecessors

A `task_dependencies(predecessor_id, successor_id)` table is an edge list. "All
transitive predecessors of task X" is the same recursive-ancestor pattern as the
hierarchy, walking the other direction:

```sql
with recursive preds as (
  select predecessor_id, successor_id, 1 as depth
  from task_dependencies where successor_id = 42
  union all
  select d.predecessor_id, d.successor_id, p.depth + 1
  from task_dependencies d
  join preds p on d.successor_id = p.predecessor_id
)
select distinct predecessor_id from preds;
```

"Tasks ready to start" — status `todo` and every predecessor already `done` — doesn't
need recursion, just an anti-join against unfinished direct predecessors:

```sql
select t.id, t.title
from tasks t
where t.status = 'todo'
  and not exists (
    select 1
    from task_dependencies d
    join tasks p on p.id = d.predecessor_id
    where d.successor_id = t.id and p.status <> 'done'
  );
```

Note this only needs *direct* predecessors: if a chain A→B→C exists and A isn't
done, B can't be `todo` yet either (something upstream of this data should have kept
it in an earlier state), so checking one level deep is enough in practice — but it
depends on the app enforcing that invariant, not the schema.

## The critical path

The critical path — the longest chain of dependent work, which sets the floor for
how fast the whole project can finish — is "for each task, the longest weighted path
of predecessors leading to it," weighted by `estimate_minutes`. A recursive CTE
accumulates the path and its sum, and you keep the max per task:

```sql
with recursive paths as (
  select id as task_id, array[id] as path, estimate_minutes as total_minutes
  from tasks
  where id not in (select successor_id from task_dependencies)

  union all

  select d.successor_id, p.path || d.successor_id, p.total_minutes + t.estimate_minutes
  from task_dependencies d
  join paths p on d.predecessor_id = p.task_id
  join tasks t on t.id = d.successor_id
  where not d.successor_id = any(p.path)
)
select task_id, path, total_minutes
from (
  select *, row_number() over (partition by task_id order by total_minutes desc) as rn
  from paths
) ranked
where rn = 1;
```

This is exponential in the worst case — a diamond-shaped graph (two paths converging
on one node) doubles the row count at the convergence point, and wide graphs with
many diamonds blow up fast. It's fine for the dozens-of-tasks graphs in this lesson
and for interactive "what's blocking this one task" queries. A real scheduler
computing the critical path for thousands of tasks does it in application code with
a proper longest-path algorithm (topological sort plus one pass, O(V+E)), not by
enumerating every path in SQL — know the SQL version as the readable one-off tool,
not the production algorithm.

## Topological order

A topological order — every predecessor listed before its successors — falls out of
repeated selection: at each step, take any `ready` task (no unfinished predecessor
among what's already ordered), add it, and recompute readiness. In SQL this is
usually easier to express as "order by the longest path length to each node" (from
the `paths` CTE above, `array_length(path, 1)`) than as a literal Kahn's-algorithm
loop, since SQL doesn't have a clean iterative "remove and repeat" primitive short of
another recursive CTE.

## jsonb: vendor payloads without a table per shape

A `vendor_events.payload jsonb` column holds a shape that varies per vendor and
isn't worth a normalized table for — extract what you need, filter on it, and
aggregate back into JSON for an API response.

- `payload ->> 'vendor'` — extract a top-level key as `text` (`->` keeps it as
  `jsonb`, `->>` casts to `text`).
- `payload -> 'items'` then `jsonb_array_elements(...)` — unnest a JSON array into
  rows, one per element, so you can aggregate or filter on the elements.
- `payload @> '{"vendor": "Acme"}'::jsonb` — containment: "does this document
  include at least these key/value pairs." Indexable with a GIN index (108 covers
  the index; the operator is the thing to know here).
- `jsonb_agg(...)` / `jsonb_build_object(...)` — the reverse direction: build a JSON
  array of objects out of relational rows, which is exactly the shape a GraphQL
  resolver returns to a client.

```sql
select
  payload ->> 'vendor' as vendor,
  count(*)::int as shipments,
  sum((item ->> 'qty')::int)::int as total_qty
from vendor_events, jsonb_array_elements(payload -> 'items') as item
where payload ->> 'type' = 'shipment'
group by payload ->> 'vendor';
```

## GROUPING SETS and ROLLUP, briefly

`GROUP BY GROUPING SETS ((project_id, status), (project_id), ())` computes several
grouping granularities — per project+status, per project, and a grand total — in one
scan instead of three queries `UNION`ed together. `ROLLUP(a, b)` is shorthand for the
grouping sets that build up left to right: `(a,b)`, `(a)`, `()`. Reach for it when a
report legitimately wants subtotals and a grand total alongside the detail rows;
don't reach for it just to avoid writing a second query, since the `NULL`-marks-a-
subtotal-row convention it produces needs `grouping(col)` to disambiguate from a real
`NULL` value in that column.

## From query to resolver

A view or a parameterized query in this lesson is, almost unchanged, a GraphQL
resolver (110 covers building the server): the resolver's job is mostly "run this
query with these arguments, shape the rows into the response type." The one thing
that doesn't translate directly is doing it once per row — a `ready_tasks` field
resolved per-project, called once per project in a list, is an N+1 query unless the
resolver batches by the list of project ids it was actually asked for and issues one
query with `WHERE project_id = ANY($ids)`, splitting the single result set by id
afterward. Every query pattern above works batched exactly as well as single — the
discipline is in the resolver, not the SQL.

## Further reading (optional)

- [PostgreSQL: Recursive Queries](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-RECURSIVE)
- [PostgreSQL: SEARCH and CYCLE Clauses](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-CYCLE)
- [PostgreSQL: jsonb Functions and Operators](https://www.postgresql.org/docs/current/functions-json.html)
- [PostgreSQL: GROUPING SETS, CUBE, ROLLUP](https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUPING-SETS)
