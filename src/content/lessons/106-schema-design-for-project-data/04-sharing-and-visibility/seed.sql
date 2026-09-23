-- The schema from the previous exercise, plus fixture data: two organizations, four users,
-- their memberships, two projects (one shared to the second org as a viewer), and tasks.

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

-- Two organizations: Acme (the customer) and Vendor Co (a vendor).
insert into organizations (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Acme'),
  ('22222222-2222-2222-2222-222222222222', 'Vendor Co');

-- Four users: two at Acme, two at Vendor Co.
insert into users (id, email, display_name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alice@acme.example', 'Alice'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bob@acme.example', 'Bob'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'carol@vendorco.example', 'Carol'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'dave@vendorco.example', 'Dave');

insert into memberships (user_id, org_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'viewer'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'admin'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'member');

-- Two projects owned by Acme. Only P1 is shared with Vendor Co, as a viewer.
insert into projects (id, org_id, name) values
  ('f1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Radar Upgrade'),
  ('f2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Site Survey');

insert into project_shares (project_id, org_id, role) values
  ('f1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'viewer');

-- Tasks: three on the shared project (todo, doing, done), one on the unshared project (blocked).
insert into tasks (project_id, title, status) values
  ('f1111111-1111-1111-1111-111111111111', 'Draft antenna spec', 'todo'),
  ('f1111111-1111-1111-1111-111111111111', 'Order test hardware', 'doing'),
  ('f1111111-1111-1111-1111-111111111111', 'Kickoff call', 'done'),
  ('f2222222-2222-2222-2222-222222222222', 'Site access approval', 'blocked');
