create table users (
  id int primary key,
  name text not null
);

create table projects (
  id int primary key,
  name text not null
);

create table tasks (
  id int primary key,
  project_id int not null references projects(id),
  title text not null,
  status text not null check (status in ('todo', 'in_progress', 'done')),
  estimate_minutes int not null,
  assignee_id int references users(id),
  due_on date not null,
  created_at timestamptz not null
);

create table status_changes (
  task_id int not null references tasks(id),
  status text not null,
  changed_at timestamptz not null
);

insert into users (id, name) values
  (1, 'Alice'), (2, 'Bob'), (3, 'Carol'), (4, 'Dave'), (5, 'Eve');

insert into projects (id, name) values
  (1, 'Aurora'), (2, 'Borealis'), (3, 'Cascade');

-- Eve (user 5) is never assigned a task, on purpose: a workload view that inner-joins
-- users to tasks will silently drop her instead of showing 0.
insert into tasks (id, project_id, title, status, estimate_minutes, assignee_id, due_on, created_at) values
  (1,  1, 'Task 1',  'done',        60, 1, date '2026-09-10', timestamptz '2026-08-25 09:00+00'),
  (2,  1, 'Task 2',  'in_progress', 90, 2, date '2026-09-25', timestamptz '2026-08-26 09:00+00'),
  (3,  1, 'Task 3',  'todo',        30, 3, date '2026-09-15', timestamptz '2026-08-27 09:00+00'),
  (4,  1, 'Task 4',  'done',       120, 4, date '2026-09-05', timestamptz '2026-08-28 09:00+00'),
  (5,  1, 'Task 5',  'in_progress', 45, 1, date '2026-09-18', timestamptz '2026-08-29 09:00+00'),
  (6,  1, 'Task 6',  'todo',        60, 2, date '2026-09-30', timestamptz '2026-08-30 09:00+00'),
  (7,  1, 'Task 7',  'done',        30, 3, date '2026-09-12', timestamptz '2026-08-31 09:00+00'),
  (8,  1, 'Task 8',  'in_progress', 75, 4, date '2026-09-20', timestamptz '2026-09-01 09:00+00'),
  (9,  1, 'Task 9',  'todo',        90, 1, date '2026-09-22', timestamptz '2026-09-02 09:00+00'),
  (10, 1, 'Task 10', 'done',        60, 2, date '2026-09-14', timestamptz '2026-09-03 09:00+00'),

  (11, 2, 'Task 11', 'done',        50, 2, date '2026-09-08', timestamptz '2026-08-25 09:00+00'),
  (12, 2, 'Task 12', 'todo',        40, 3, date '2026-09-19', timestamptz '2026-08-26 09:00+00'),
  (13, 2, 'Task 13', 'in_progress',100, 4, date '2026-09-28', timestamptz '2026-08-27 09:00+00'),
  (14, 2, 'Task 14', 'done',        20, 1, date '2026-09-01', timestamptz '2026-08-28 09:00+00'),
  (15, 2, 'Task 15', 'todo',        35, 2, date '2026-09-21', timestamptz '2026-08-29 09:00+00'),
  (16, 2, 'Task 16', 'in_progress', 55, 3, date '2026-09-17', timestamptz '2026-08-30 09:00+00'),
  (17, 2, 'Task 17', 'done',        45, 4, date '2026-09-11', timestamptz '2026-08-31 09:00+00'),
  (18, 2, 'Task 18', 'todo',        65, 1, date '2026-09-29', timestamptz '2026-09-01 09:00+00'),
  (19, 2, 'Task 19', 'in_progress', 80, 2, date '2026-09-16', timestamptz '2026-09-02 09:00+00'),
  (20, 2, 'Task 20', 'done',        30, 3, date '2026-09-13', timestamptz '2026-09-03 09:00+00'),

  (21, 3, 'Task 21', 'done',        70, 3, date '2026-09-09', timestamptz '2026-08-25 09:00+00'),
  (22, 3, 'Task 22', 'in_progress', 85, 4, date '2026-09-24', timestamptz '2026-08-26 09:00+00'),
  (23, 3, 'Task 23', 'todo',        25, 1, date '2026-09-14', timestamptz '2026-08-27 09:00+00'),
  (24, 3, 'Task 24', 'done',        55, 2, date '2026-09-06', timestamptz '2026-08-28 09:00+00'),
  (25, 3, 'Task 25', 'in_progress', 95, 3, date '2026-09-19', timestamptz '2026-08-29 09:00+00'),
  (26, 3, 'Task 26', 'todo',        40, 4, date '2026-09-27', timestamptz '2026-08-30 09:00+00'),
  (27, 3, 'Task 27', 'done',        60, 1, date '2026-09-10', timestamptz '2026-08-31 09:00+00'),
  (28, 3, 'Task 28', 'in_progress', 50, 2, date '2026-09-15', timestamptz '2026-09-01 09:00+00'),
  (29, 3, 'Task 29', 'todo',        30, 3, date '2026-09-23', timestamptz '2026-09-02 09:00+00'),
  (30, 3, 'Task 30', 'done',        45, 4, date '2026-09-12', timestamptz '2026-09-03 09:00+00');

-- every task starts 'todo'; tasks that moved further also get an 'in_progress' row;
-- done tasks get a final 'done' row on the date below (used by daily_completions).
insert into status_changes (task_id, status, changed_at)
select id, 'todo', created_at from tasks;

insert into status_changes (task_id, status, changed_at)
select id, 'in_progress', created_at + interval '5 days'
from tasks where status in ('in_progress', 'done');

insert into status_changes (task_id, status, changed_at) values
  (1,  'done', timestamptz '2026-09-14 12:00+00'),
  (4,  'done', timestamptz '2026-09-14 15:00+00'),
  (7,  'done', timestamptz '2026-09-15 10:00+00'),
  (10, 'done', timestamptz '2026-09-16 09:00+00'),
  (11, 'done', timestamptz '2026-09-16 14:00+00'),
  (14, 'done', timestamptz '2026-09-17 09:00+00'),
  (17, 'done', timestamptz '2026-09-17 11:00+00'),
  (20, 'done', timestamptz '2026-09-17 16:00+00'),
  (21, 'done', timestamptz '2026-09-18 10:00+00'),
  (24, 'done', timestamptz '2026-09-19 10:00+00'),
  (27, 'done', timestamptz '2026-09-20 10:00+00'),
  (30, 'done', timestamptz '2026-09-20 17:00+00');
