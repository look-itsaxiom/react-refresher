-- Q1: equality columns first (project_id, status), then the sort column
-- (due_on), scoped to open rows with a partial index.
create index idx_tasks_project_status_due
  on tasks (project_id, status, due_on)
  where deleted_at is null;

-- Q2: single equality column, scoped to open rows.
create index idx_tasks_assignee
  on tasks (assignee_id)
  where deleted_at is null;

-- Q3: range column, no partial predicate needed (the query itself has none).
create index idx_tasks_created_at
  on tasks (created_at);

-- Q4: keyset pagination matches an index on the same (column, tiebreaker)
-- pair used in the WHERE and ORDER BY.
create index idx_tasks_due_id
  on tasks (due_on, id);

-- One open task per (project_id, title); soft-deleted rows don't count.
create unique index uq_tasks_open_project_title
  on tasks (project_id, title)
  where deleted_at is null;
