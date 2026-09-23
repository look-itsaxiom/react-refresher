create view visible_projects as
select m.user_id, p.id as project_id, 'member'::text as access
from memberships m
join projects p on p.org_id = m.org_id
where p.deleted_at is null
union
select ms.user_id, s.project_id, s.role::text as access
from project_shares s
join memberships ms on ms.org_id = s.org_id
join projects p on p.id = s.project_id
where p.deleted_at is null;

create view task_counts_by_project as
select
  t.project_id,
  count(*) filter (where t.status = 'todo')::int as todo,
  count(*) filter (where t.status = 'doing')::int as doing,
  count(*) filter (where t.status = 'blocked')::int as blocked,
  count(*) filter (where t.status = 'done')::int as done,
  count(*)::int as total
from tasks t
group by t.project_id;

create or replace function can_edit_task(p_user uuid, p_task uuid) returns boolean as $$
  select exists (
    select 1
    from tasks t
    join projects p on p.id = t.project_id
    join memberships m on m.org_id = p.org_id and m.user_id = p_user
    where t.id = p_task and m.role in ('owner', 'admin', 'member')
  )
  or exists (
    select 1
    from tasks t
    join project_shares s on s.project_id = t.project_id
    join memberships m on m.org_id = s.org_id and m.user_id = p_user
    where t.id = p_task and s.role = 'editor'
  );
$$ language sql stable;
