-- Each view below "sort of" answers its question, but has a bug. Fix them in place —
-- keep the view names and column names exactly as given.

create view task_ancestors as
-- BUG: not recursive — only reports the direct parent, so anything more than one
-- level up (a grandparent) never shows up.
select id as task_id, parent_id as ancestor_id, 1 as depth
from task_hierarchy
where parent_id is not null;

create view ready_tasks as
select t.id, t.title
from tasks t
where t.status = 'todo'
  -- BUG: EXISTS a done predecessor is not the same as "every predecessor is done" —
  -- a task with one done predecessor and one unfinished one is wrongly included, and
  -- a task with zero predecessors is wrongly excluded (EXISTS over no rows is false).
  and exists (
    select 1
    from task_dependencies d
    join tasks p on p.id = d.predecessor_id
    where d.successor_id = t.id and p.status = 'done'
  );

create view critical_path as
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
  -- BUG: ascending order keeps the SHORTEST path per task, not the longest.
  select *, row_number() over (partition by task_id order by total_minutes asc, path) as rn
  from paths
) ranked
where rn = 1;

create view shipments_by_vendor as
select
  payload ->> 'vendor' as vendor,
  -- BUG: counts every event as a shipment, without checking payload->>'type'.
  count(*)::int as shipments,
  -- BUG: counts how many items are in the array instead of summing their qty.
  sum(jsonb_array_length(payload -> 'items'))::int as total_qty
from vendor_events
group by payload ->> 'vendor';
