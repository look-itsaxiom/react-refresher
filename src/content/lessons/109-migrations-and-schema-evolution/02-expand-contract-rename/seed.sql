create table tasks (
  id int primary key,
  title text not null,
  estimate_minutes int,
  status text not null default 'todo'
);

insert into tasks (id, title, estimate_minutes, status)
select
  g,
  'Task ' || g,
  (g % 8 + 1) * 15,
  case when g % 5 = 0 then 'done' else 'todo' end
from generate_series(1, 40) g;

-- The API's read path today. Any migration has to keep this working
-- until the deployed code stops calling it.
create view legacy_api_tasks as
select id, title, estimate_minutes from tasks;
