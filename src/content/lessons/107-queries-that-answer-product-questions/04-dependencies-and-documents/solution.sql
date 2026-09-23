create view task_ancestors as
with recursive anc as (
  select id as task_id, parent_id as ancestor_id, 1 as depth
  from task_hierarchy
  where parent_id is not null

  union all

  select a.task_id, h.parent_id, a.depth + 1
  from anc a
  join task_hierarchy h on h.id = a.ancestor_id
  where h.parent_id is not null
)
select task_id, ancestor_id, depth from anc;

create view ready_tasks as
select t.id, t.title
from tasks t
where t.status = 'todo'
  and not exists (
    select 1
    from task_dependencies d
    join tasks p on p.id = d.predecessor_id
    where d.successor_id = t.id and p.status <> 'done'
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
  select *, row_number() over (partition by task_id order by total_minutes desc, path desc) as rn
  from paths
) ranked
where rn = 1;

create view shipments_by_vendor as
select
  payload ->> 'vendor' as vendor,
  count(*)::int as shipments,
  sum(item_qty)::int as total_qty
from vendor_events
cross join lateral (
  select sum((item ->> 'qty')::int) as item_qty
  from jsonb_array_elements(payload -> 'items') as item
) items
where payload ->> 'type' = 'shipment'
group by payload ->> 'vendor';
