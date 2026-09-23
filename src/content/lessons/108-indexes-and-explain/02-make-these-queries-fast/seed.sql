create table projects (id int primary key);
create table users (id int primary key);
insert into projects (id) select g from generate_series(1, 50) g;
insert into users (id) select g from generate_series(1, 200) g;

create table tasks (
  id int generated always as identity primary key,
  project_id int not null references projects(id),
  assignee_id int references users(id),
  status text not null,
  title text not null,
  due_on date,
  deleted_at timestamptz,
  created_at timestamptz not null
);

insert into tasks (project_id, assignee_id, status, title, due_on, deleted_at, created_at)
select
  (g % 50) + 1,
  (g % 200) + 1,
  case
    when g % 23 = 0 then 'todo'
    when g % 53 = 0 then 'in_progress'
    else 'done'
  end,
  'Task ' || g,
  date '2026-01-01' + (g % 300),
  case when g % 37 = 0 then timestamptz '2026-05-01' else null end,
  timestamptz '2026-01-01' + (g % 260) * interval '1 day'
from generate_series(1, 20000) g;

analyze tasks;
