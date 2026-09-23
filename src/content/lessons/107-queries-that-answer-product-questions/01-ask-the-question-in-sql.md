# Ask the question in SQL

Schema design (106) gave you tables. This lesson is about turning product questions
into queries against them — "what's blocking the launch?", "who's overloaded next
week?", "what changed since yesterday?" — the questions a PM or a teammate actually
asks, not "select star from tasks." A resolver, a dashboard endpoint, and a debugging
session all come down to the same skill: shape the question as a join, a filter, an
aggregate, or a window, and know which one is the right tool before you reach for it.

## Join shapes, and the anti-join

An `INNER JOIN` keeps rows that match on both sides. A `LEFT JOIN` keeps every row on
the left whether or not it matches, filling unmatched right-side columns with `NULL`.
The join shape you reach for depends on whether "no match" is itself the answer:

```sql
-- users with zero open tasks must still appear, with 0 minutes, not disappear
select u.id, u.name, count(t.id)::int as open_tasks
from users u
left join tasks t on t.assignee_id = u.id and t.status <> 'done'
group by u.id, u.name;
```

An `INNER JOIN` here would silently drop anyone with no open tasks — exactly the
person a workload dashboard most needs to show, at zero. That's the recurring bug in
"who is overloaded" queries: they read fine, they just never mention the idle people.

The anti-join — "rows on the left with no match on the right" — is a `LEFT JOIN` plus
`WHERE right.key IS NULL`:

```sql
-- projects with no tasks at all
select p.id, p.name
from projects p
left join tasks t on t.project_id = p.id
where t.id is null;
```

`NOT IN (select ...)` looks equivalent and is the classic trap: if the subquery's
column can return even one `NULL`, `NOT IN` returns no rows at all, silently, because
`x NOT IN (1, NULL)` is `x <> 1 AND x <> NULL`, and anything compared to `NULL` is
`UNKNOWN`, not `TRUE`. `NOT EXISTS` doesn't have this failure mode:

```sql
select p.id, p.name
from projects p
where not exists (select 1 from tasks t where t.project_id = p.id);
```

Prefer `EXISTS`/`NOT EXISTS` over `IN`/`NOT IN` for subqueries by default. `EXISTS`
stops at the first match and never has the `NULL` trap; `IN` is fine when the list is
a small, known-non-null set of literals.

## NULL semantics, briefly

`= NULL` is never true — it's `UNKNOWN`, and `WHERE` treats `UNKNOWN` like `FALSE`.
Testing for a missing value needs `IS NULL` / `IS NOT NULL`. `count(column)` skips
`NULL`s; `count(*)` doesn't. Aggregates over an empty group return `NULL`, not `0`,
which is why `coalesce(sum(x), 0)` shows up constantly in reporting queries — without
it, "zero activity" renders as a blank cell instead of a zero.

## Aggregation with FILTER and grouping sets

`FILTER (WHERE ...)` computes a conditional aggregate without a `CASE` expression or
a self-join, and — unlike wrapping the argument in `CASE WHEN cond THEN x END` — it
reads as "this aggregate, only over these rows," which is easier to get right when
you need several conditional counts side by side:

```sql
select project_id,
  count(*) filter (where status = 'done')::int as done,
  count(*) filter (where status <> 'done' and due_on < current_date)::int as overdue
from tasks
group by project_id;
```

`GROUP BY ROLLUP(a, b)` produces the normal `(a, b)` groups plus `(a, NULL)` and
`(NULL, NULL)` subtotal/grand-total rows in one pass — useful for a report that wants
per-project, per-status counts and a project total and a grand total without three
separate queries unioned together. `GROUPING SETS((a, b), (a), ())` is the general
form when the subtotals you want aren't a strict rollup.

## CTEs as named steps

A `WITH` clause names an intermediate result so a query reads as a sequence of steps
instead of one deeply nested expression:

```sql
with open_by_assignee as (
  select assignee_id, count(*)::int as n
  from tasks
  where status <> 'done'
  group by assignee_id
)
select u.name, coalesce(o.n, 0) as open_tasks
from users u
left join open_by_assignee o on o.assignee_id = u.id
order by open_tasks desc;
```

Through Postgres 11, a non-recursive CTE was an optimization fence — the planner
always materialized it, which occasionally helped (pin down an expensive subquery's
result) and often hurt (block a filter from pushing down into it). Postgres 12
changed the default: a CTE referenced once and not recursive is now inlined like a
subquery, unless you mark it `MATERIALIZED` to force the old fence-it-off behavior —
useful when you deliberately want a CTE evaluated once even though it's cheap to
re-evaluate, such as a `random()`-based sample other CTEs join against repeatedly.

## Window functions: ranking, running totals, previous-row

A window function computes across a set of rows related to the current one —a
*partition*, ordered by an *order by*, over a *frame* — without collapsing them into
one row the way `GROUP BY` does. Every row keeps its identity; the window function
just adds a column computed from its neighbors.

```sql
select task_id, changed_at,
  row_number() over (partition by task_id order by changed_at desc) as rn
from status_changes;
```

`row_number()` gives each partition's rows 1, 2, 3, ... in order — the tool for
"latest row per group" (`where rn = 1`) or "second most recent." `rank()` and
`dense_rank()` differ only in how they handle ties: `rank()` leaves gaps after a tie
(1, 1, 3), `dense_rank()` doesn't (1, 1, 2).

`lag(col)`/`lead(col)` read the previous/next row's value within the same partition
and order — the direct tool for "what changed since the last status" without a
self-join:

```sql
select task_id, status, changed_at,
  lag(status) over (partition by task_id order by changed_at) as prev_status
from status_changes;
```

A running total needs a *frame*, which defaults to "start of partition through
current row" when an `ORDER BY` is present, so `sum(x) over (order by day)` already
gives a running total without writing the frame out. Writing it explicitly makes the
intent clear and survives changes elsewhere in the query:

```sql
select day, completed,
  sum(completed) over (order by day rows between unbounded preceding and current row) as running_total
from daily_completions;
```

## DISTINCT ON: latest-per-group, the Postgres way

`DISTINCT ON (expr)` keeps the first row per distinct value of `expr`, using
whatever `ORDER BY` you give it to decide "first" — a one-line answer to
"latest status per task" that a `row_number()` + filter would also solve, but more
verbosely:

```sql
select distinct on (task_id) task_id, status, changed_at
from status_changes
order by task_id, changed_at desc;
```

`ORDER BY` here does double duty: it must start with the `DISTINCT ON` expression(s),
and the tiebreaker after that decides which row survives. This is Postgres-specific
syntax — not standard SQL — so `row_number() over (partition by ...) ... where rn = 1`
is the portable equivalent if you ever need one.

## LATERAL: a subquery that sees the current row

An ordinary subquery in a `FROM` clause can't reference columns from another table in
the same `FROM` list. `LATERAL` lifts that restriction — the subquery is evaluated
once per row of whatever precedes it, with that row's columns in scope. This is the
tool for "top N per group" and other per-row lookups a plain join can't express
without a window function and an extra filter:

```sql
-- the 3 most recent status changes per task
select t.id, sc.status, sc.changed_at
from tasks t
cross join lateral (
  select status, changed_at
  from status_changes
  where status_changes.task_id = t.id
  order by changed_at desc
  limit 3
) sc;
```

`JOIN ... ON true` is `CROSS JOIN LATERAL` spelled a different way; both mean "run
this subquery per outer row, keep unmatched outer rows only if you say `LEFT JOIN
LATERAL ... ON true`."

## Dates, calendars, and pagination

`date_trunc('day', ts)` (or `'week'`, `'month'`) buckets a timestamp down to a unit —
the standard way to group events by day for a chart. `interval` arithmetic
(`due_on + interval '3 days'`, `current_date - due_on`) is straightforward; the trap
is `now()` inside a query you're writing checks against — pin dates to a literal
(`date '2026-09-21'`) whenever the answer needs to be reproducible.
`generate_series(start, stop, interval)` produces a row per unit, which is how you
build a calendar: `LEFT JOIN` real data onto the generated series so days with zero
activity still show up as a row instead of being absent.

Pagination by `OFFSET N LIMIT M` re-scans and discards the first `N` rows on every
page and — like the anti-join trap above — breaks under concurrent writes: a page
boundary is a row count, and row counts shift when rows are inserted or deleted ahead
of that position. Keyset pagination carries the last row's sort key forward instead
(`where (created_at, id) < ($last_created_at, $last_id) order by created_at desc, id
desc limit 20`), which stays correct regardless of what else changes in the table.
108 covers the index that makes keyset pagination fast; this lesson only needs you to
recognize `OFFSET` as the wrong default for anything paging live data.

## Further reading (optional)

- [PostgreSQL: Window Functions](https://www.postgresql.org/docs/current/tutorial-window.html)
- [PostgreSQL: LATERAL subqueries](https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-LATERAL)
- [PostgreSQL: WITH Queries (CTEs)](https://www.postgresql.org/docs/current/queries-with.html)
- [PostgreSQL: SELECT — DISTINCT ON](https://www.postgresql.org/docs/current/sql-select.html#SQL-DISTINCT)
