-- This schema "works" but has the wrong shape: serial ids instead of uuid, status columns
-- as bare text with no check, no ON DELETE behavior on any foreign key, no composite
-- primary key on memberships, and no updated_at trigger. Replace it with the real thing
-- described in the prompt.

create table organizations (
  id serial primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table users (
  id serial primary key,
  email text not null unique,
  display_name text not null
);

create table memberships (
  id serial primary key,
  user_id int not null references users(id),
  org_id int not null references organizations(id),
  role text not null
);

create table projects (
  id serial primary key,
  org_id int not null references organizations(id),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table project_shares (
  id serial primary key,
  project_id int not null references projects(id),
  org_id int not null references organizations(id),
  role text not null
);

create table tasks (
  id serial primary key,
  project_id int not null references projects(id),
  title text not null,
  status text not null default 'todo',
  estimate_minutes int,
  assignee_id int references users(id),
  due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_dependencies (
  id serial primary key,
  predecessor_id int not null references tasks(id),
  successor_id int not null references tasks(id)
);
