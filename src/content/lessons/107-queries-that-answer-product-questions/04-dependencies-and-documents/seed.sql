create table tasks (
  id int primary key,
  title text not null,
  estimate_minutes int not null,
  status text not null check (status in ('todo', 'in_progress', 'done'))
);

-- predecessor_id must finish before successor_id can start.
create table task_dependencies (
  predecessor_id int not null references tasks(id),
  successor_id int not null references tasks(id)
);

-- a separate, ordinary parent/subtask tree -- unrelated to the dependency graph above.
create table task_hierarchy (
  id int primary key,
  parent_id int references task_hierarchy(id),
  title text not null
);

create table vendor_events (
  id int primary key,
  task_id int references tasks(id),
  payload jsonb not null
);

-- a diamond (1 -> 2 -> 4 and 1 -> 3 -> 4) plus two independent chains, plus one
-- isolated task with no dependencies at all.
insert into tasks (id, title, estimate_minutes, status) values
  (1,  'Task 1',  30, 'done'),
  (2,  'Task 2',  50, 'done'),
  (3,  'Task 3',  20, 'todo'),
  (4,  'Task 4',  40, 'todo'),
  (5,  'Task 5',  25, 'todo'),
  (6,  'Task 6',  35, 'todo'),
  (7,  'Task 7',  45, 'todo'),
  (8,  'Task 8',  15, 'done'),
  (9,  'Task 9',  55, 'todo'),
  (10, 'Task 10', 25, 'todo'),
  (11, 'Task 11', 65, 'in_progress'),
  (12, 'Task 12', 20, 'todo');

insert into task_dependencies (predecessor_id, successor_id) values
  (1, 2), (1, 3), (2, 4), (3, 4),   -- diamond: 4 needs both 2 and 3
  (5, 6), (6, 7),                   -- chain
  (8, 9), (9, 10), (10, 11);        -- chain
  -- task 12 has no dependency rows at all, either side.

-- two three-level trees (Program Alpha, Program Beta), 10 nodes total.
insert into task_hierarchy (id, parent_id, title) values
  (100, null, 'Program Alpha'),
  (101, 100,  'Workstream A'),
  (102, 100,  'Workstream B'),
  (103, 101,  'Subtask A1'),
  (104, 101,  'Subtask A2'),
  (105, 102,  'Subtask B1'),
  (106, 102,  'Subtask B2'),
  (109, null, 'Program Beta'),
  (110, 109,  'Workstream C'),
  (111, 110,  'Subtask C1');

insert into vendor_events (id, task_id, payload) values
  (1, 1, '{"vendor":"Acme","type":"shipment","items":[{"sku":"A1","qty":2},{"sku":"A2","qty":3}],"eta":"2026-10-01"}'),
  (2, 2, '{"vendor":"Acme","type":"shipment","items":[{"sku":"A1","qty":5}],"eta":"2026-10-03"}'),
  (3, 5, '{"vendor":"Zenith","type":"shipment","items":[{"sku":"Z9","qty":7}],"eta":"2026-09-28"}'),
  (4, 8, '{"vendor":"Orbital","type":"shipment","items":[{"sku":"O1","qty":4},{"sku":"O2","qty":6}],"eta":"2026-10-05"}'),
  (5, 9, '{"vendor":"Orbital","type":"shipment","items":[{"sku":"O1","qty":2}],"eta":"2026-10-07"}'),
  (6, 3, '{"vendor":"Zenith","type":"note","items":[],"note":"delay expected"}');
