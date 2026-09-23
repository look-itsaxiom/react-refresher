create view project_progress as
select
  p.id as project_id,
  p.name,
  count(t.id)::int as total,
  count(t.id) filter (where t.status = 'done')::int as done,
  round(100.0 * count(t.id) filter (where t.status = 'done') / count(t.id), 1) as done_pct
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
left join tasks t on t.assignee_id = u.id
group by u.id, u.name
order by open_minutes desc;

create view overdue_tasks as
select
  t.id,
  t.title,
  t.project_id,
  (date '2026-09-21' - t.due_on)::int as days_overdue
from tasks t
where t.status <> 'done'
  and t.due_on < date '2026-09-21';

create view latest_status as
select distinct on (task_id)
  task_id,
  status,
  changed_at
from status_changes
order by task_id, changed_at desc;

create view daily_completions as
select
  day,
  completed,
  sum(completed) over (order by day rows between unbounded preceding and current row)::int as running_total
from (
  select
    date_trunc('day', changed_at)::date as day,
    count(*)::int as completed
  from status_changes
  where status = 'done'
  group by date_trunc('day', changed_at)::date
) daily;
