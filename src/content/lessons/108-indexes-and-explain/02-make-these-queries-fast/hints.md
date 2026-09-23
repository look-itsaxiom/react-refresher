Q1 filters on two equality columns (`project_id`, `status`) and sorts by `due_on`. Put the
equality columns first in a composite index, then the sort column, so the index both narrows
the search and hands rows back already ordered. All four `Q1`-relevant rows also share
`deleted_at is null` — that's a good candidate for a partial index's `WHERE` clause rather
than a fourth indexed column.

---

Q2 and the uniqueness constraint both only ever care about *open* (`deleted_at is null`)
tasks. A partial index scoped to that condition is smaller and cheaper to maintain than
indexing every row, most of which no query in this exercise filters for.

---

Q3's filter is a range on `created_at` with no other condition — a plain B-tree index on
that one column is enough; it doesn't need to be partial.

---

Q4 is keyset pagination: the `WHERE` clause and the `ORDER BY` both reference `(due_on, id)`
in that order. An index on exactly `(due_on, id)` lets Postgres seek straight to the right
starting point and read forward, with no separate sort step.

---

The uniqueness constraint is `CREATE UNIQUE INDEX ... ON tasks (project_id, title) WHERE
deleted_at IS NULL` — a unique index, not a `UNIQUE` table constraint (which can't carry a
`WHERE` clause). Only rows matching the `WHERE` clause participate in the uniqueness check.

---

Full solution shape (five `CREATE INDEX` statements):

```sql
create index idx_tasks_project_status_due
  on tasks (project_id, status, due_on) where deleted_at is null;
create index idx_tasks_assignee
  on tasks (assignee_id) where deleted_at is null;
create index idx_tasks_created_at
  on tasks (created_at);
create index idx_tasks_due_id
  on tasks (due_on, id);
create unique index uq_tasks_open_project_title
  on tasks (project_id, title) where deleted_at is null;
```
