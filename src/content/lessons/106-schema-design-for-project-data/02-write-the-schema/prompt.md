# Write the schema

`query.sql` has a starting schema for the cross-organization program tool, but it was
written by someone in a hurry: every id is a `serial`, every enum-shaped column is bare
`text`, no foreign key says what happens on delete, and nothing stamps `updated_at`. Replace
it with the real thing.

Your `query.sql` must create, from an empty database:

- Three enums: `membership_role` (`'owner'`, `'admin'`, `'member'`, `'viewer'`), `share_role`
  (`'editor'`, `'viewer'`), `task_status` (`'todo'`, `'doing'`, `'blocked'`, `'done'`).
- `organizations(id uuid primary key default gen_random_uuid(), name text not null unique,
  created_at timestamptz not null default now())`.
- `users(id uuid primary key default gen_random_uuid(), email text not null unique,
  display_name text not null)`.
- `memberships(user_id uuid not null references users(id), org_id uuid not null references
  organizations(id), role membership_role not null, primary key (user_id, org_id))` — the
  primary key *is* the composite of the two foreign keys, there's no separate `id` column.
- `projects(id uuid primary key default gen_random_uuid(), org_id uuid not null references
  organizations(id) on delete restrict, name text not null, created_at timestamptz not null
  default now(), updated_at timestamptz not null default now(), deleted_at timestamptz)`,
  with `unique (org_id, name)`.
- `project_shares(project_id uuid not null references projects(id) on delete cascade, org_id
  uuid not null references organizations(id) on delete cascade, role share_role not null,
  primary key (project_id, org_id))`.
- `tasks(id uuid primary key default gen_random_uuid(), project_id uuid not null references
  projects(id) on delete cascade, title text not null check (length(title) between 1 and
  200), status task_status not null default 'todo', estimate_minutes int check
  (estimate_minutes >= 0), assignee_id uuid references users(id) on delete set null, due_on
  date, created_at timestamptz not null default now(), updated_at timestamptz not null
  default now())`.
- `task_dependencies(predecessor_id uuid not null references tasks(id) on delete cascade,
  successor_id uuid not null references tasks(id) on delete cascade, primary key
  (predecessor_id, successor_id), check (predecessor_id <> successor_id))`.
- A `plpgsql` trigger function `set_updated_at()` that sets `new.updated_at = now()`,
  attached as a `before update` trigger on both `projects` and `tasks`.

Column order and constraint names don't matter — only the shape the checks can observe:
column existence and type, which constraints reject which writes, and whether `updated_at`
actually moves on an `update`.
