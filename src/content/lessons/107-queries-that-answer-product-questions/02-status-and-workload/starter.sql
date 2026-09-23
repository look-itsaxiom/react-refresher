-- Each view below "sort of" answers its question, but has a bug. Fix them in place —
-- keep the view names and column names exactly as given.

create view project_progress as
select
  p.id as project_id,
  p.name,
  count(t.id)::int as total,
  count(t.id) filter (where t.status = 'done')::int as done,
  -- BUG: integer division truncates before the multiply, so this is almost always 0.
  (count(t.id) filter (where t.status = 'done') / count(t.id) * 100) as done_pct
from projects p
join tasks t on t.project_id = p.id
group by p.id, p.name;

create view assignee_load as
select
  u.id as assignee_id,
  u.name,
  count(t.id) filter (where t.status <> 'done')::int as open_tasks,
  coalesce(sum(t.estimate_minutes) filter (where t.status <> 'done'), 0)::int as open_minutes
from users u
-- BUG: an assignee with no tasks at all (Eve) has no row to join, so INNER JOIN drops
-- her instead of showing her with 0 open tasks.
join tasks t on t.assignee_id = u.id
group by u.id, u.name
order by open_minutes desc;

create view overdue_tasks as
select
  t.id,
  t.title,
  t.project_id,
  (date '2026-09-21' - t.due_on)::int as days_overdue
from tasks t
-- BUG: missing the "not done" filter, so a task finished well past its original due
-- date still shows up as overdue.
where t.due_on < date '2026-09-21';

create view latest_status as
select distinct on (task_id)
  task_id,
  status,
  changed_at
from status_changes
-- BUG: ascending order makes DISTINCT ON keep the EARLIEST row per task, not the latest.
order by task_id, changed_at asc;

create view daily_completions as
select
  date_trunc('day', changed_at)::date as day,
  count(*)::int as completed,
  -- BUG: not a running total at all — just repeats that day's count.
  count(*)::int as running_total
from status_changes
where status = 'done'
group by date_trunc('day', changed_at)::date;
