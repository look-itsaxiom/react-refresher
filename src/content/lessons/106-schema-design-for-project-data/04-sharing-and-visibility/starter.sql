-- Skeletons that compile but give the wrong answers. visible_projects only looks at
-- membership, so shared projects never show up for the org they're shared with, and
-- can_edit_task ignores role entirely, so viewers can "edit". Fix all three.

create view visible_projects as
select m.user_id, p.id as project_id, 'member'::text as access
from memberships m
join projects p on p.org_id = m.org_id
where p.deleted_at is null;

create view task_counts_by_project as
select
  t.project_id,
  count(*)::int as todo,
  0 as doing,
  0 as blocked,
  0 as done,
  count(*)::int as total
from tasks t
group by t.project_id;

create or replace function can_edit_task(p_user uuid, p_task uuid) returns boolean as $$
  select exists (
    select 1
    from tasks t
    join projects p on p.id = t.project_id
    join memberships m on m.org_id = p.org_id and m.user_id = p_user
    where t.id = p_task
  );
$$ language sql stable;
