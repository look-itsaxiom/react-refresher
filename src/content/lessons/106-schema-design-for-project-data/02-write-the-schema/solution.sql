create type membership_role as enum ('owner', 'admin', 'member', 'viewer');
create type share_role as enum ('editor', 'viewer');
create type task_status as enum ('todo', 'doing', 'blocked', 'done');

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null
);

create table memberships (
  user_id uuid not null references users(id),
  org_id uuid not null references organizations(id),
  role membership_role not null,
  primary key (user_id, org_id)
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (org_id, name)
);

create table project_shares (
  project_id uuid not null references projects(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  role share_role not null,
  primary key (project_id, org_id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  status task_status not null default 'todo',
  estimate_minutes int check (estimate_minutes >= 0),
  assignee_id uuid references users(id) on delete set null,
  due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_dependencies (
  predecessor_id uuid not null references tasks(id) on delete cascade,
  successor_id uuid not null references tasks(id) on delete cascade,
  primary key (predecessor_id, successor_id),
  check (predecessor_id <> successor_id)
);

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();

create trigger tasks_set_updated_at before update on tasks
  for each row execute function set_updated_at();
