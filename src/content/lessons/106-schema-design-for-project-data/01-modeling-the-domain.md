# Modeling the domain, not the UI

You've written plenty of `interface Project { ... }` types for a frontend. Schema design is
the same instinct pointed at storage instead of props: name the entities, name the
relationships, and write down every invariant as a constraint the database enforces instead
of a comment. This track runs on PGlite — real PostgreSQL 17 compiled to WebAssembly, in
your browser tab, not a mock. The SQL you write here is the SQL that would run against a
managed Postgres instance in production, modulo a couple of PGlite limits noted below.

The domain for this lesson, and for the rest of this track, is a project-management tool
for hardware programs: several companies — a customer, one or more vendors, a couple of
contract partners — collaborate on one program. That "several companies, one program" shape
is the whole design problem. A todo app has one user owning their own data. This app has
rows that are legitimately visible, and sometimes editable, by people who work for different
companies. If you're interviewing for a system with this shape, the schema is where you
prove you understand the problem before you write a line of Go or GraphQL.

## Entities and relationships

Start from nouns, then ask which nouns can have many of which other nouns:

- **organizations** — a company: the customer, a vendor, a partner.
- **users** — a person, who belongs to one or more organizations.
- **memberships** — the join between user and org, carrying a role (`owner`, `admin`,
  `member`, `viewer`). A user can belong to more than one org (a contractor working two
  accounts), so this is genuinely many-to-many, not a `users.org_id` column.
- **projects** — owned by exactly one organization. One-to-many from organizations.
- **project_shares** — a project shared with another organization, at a role (`editor` or
  `viewer`). This is the second many-to-many: many projects can be shared with many orgs.
- **tasks** — belong to one project, have a status, an optional assignee, an estimate, a due
  date.
- **task_dependencies** — a directed edge, predecessor → successor, between two tasks in
  (usually) the same project.
- **comments** — attached to a task, authored by a user. Not built out in this lesson's
  exercises, but it follows the same shape as tasks: a foreign key to its parent, an author,
  audit columns.

## Surrogate keys: uuid vs bigint identity

Every table above needs a primary key that isn't a business fact, because business facts
change (an email gets corrected, a project gets renamed) and primary keys shouldn't. Two
realistic choices in 2026 Postgres:

- **`uuid primary key default gen_random_uuid()`** — `gen_random_uuid()` has been a built-in
  Postgres function since Postgres 13 (no `pgcrypto` extension needed). UUIDs can be
  generated client-side before an insert, which matters for offline-first or optimistic-UI
  flows, and they don't leak row counts or creation order to anyone who sees an id. The cost:
  16 bytes vs 8, worse index locality for the purely random v4 form (new keys scatter across
  the whole b-tree instead of appending, so index pages you just touched get evicted before
  you touch them again), and they're not sortable by time. Sortable variants (`uuidv7`,
  effectively a timestamp-prefixed UUID) landed as a Postgres 18 built-in — hedge: check
  `select gen_random_uuid_v7()`/`uuidv7()` availability on whatever engine you're targeting,
  since 18 was recent as of this writing and PGlite tracks its own Postgres version.
- **`bigint generated always as identity`** — the modern (Postgres 10+) replacement for
  `serial`. Prefer it over `serial` for two concrete reasons: `serial` is sugar over a
  sequence plus a default plus an implicit ownership dependency, which behaves oddly under
  `pg_dump`/restore and lets anyone `INSERT` an explicit id that collides with the sequence;
  `generated always as identity` refuses an explicit value unless you say
  `overriding system value`, closing that hole. Bigints are smaller, append-only in the
  index, and sortable by insertion order — sometimes a leak you don't want (id 4 was created
  right after id 3), sometimes exactly the ordering you need.

This lesson's exercises use `uuid`, because the target system for this interview prep is
multiplayer and cross-organization: ids get generated in more than one place (client
optimistic inserts, a Go service, a queue consumer) and you don't want two of them handing
out the same sequence value. Say so explicitly in an interview — "uuid because ids may
originate outside a single writer" is a stronger answer than "uuid because it looks more
professional."

Natural keys (an email, an org's registered name) still matter — enforce them with a
`unique` constraint even though they're not the primary key. `users.email` should be
`not null unique` regardless of which surrogate key you chose.

## Multi-tenancy: three real patterns

- **Database-per-tenant.** Strongest isolation, easiest to reason about for compliance, most
  expensive to operate (migrations run N times, cross-tenant queries are impossible without
  federation). Fits a small number of very large, very sensitive tenants.
- **Schema-per-tenant.** One Postgres database, one schema per org. Better resource sharing
  than database-per-tenant, still awkward for anything that spans tenants, and migrations
  still run once per schema.
- **Shared schema, `org_id` on every row.** One set of tables, every tenant-scoped row
  carries `org_id`, application code (or row-level security) filters by it. Cheapest to run,
  easiest to query across tenants, and the only pattern that fits this domain cleanly —
  because a project isn't owned by exactly one tenant's private universe, it's a project one
  org owns that other orgs can see through `project_shares`. Database-per-tenant and
  schema-per-tenant both assume tenant boundaries are also *data* boundaries; here they
  aren't. Shared schema plus row-level security (covered in the next concept) is the pattern
  that lets one row be legitimately visible to several organizations without duplicating it
  into each tenant's copy.

Model sharing as a table, not as duplicated rows or a bag of org ids on the project. A
`project_shares(project_id, org_id, role)` row is queryable, revocable, and auditable; a
`projects.shared_with_org_ids uuid[]` column is a foreign-key-less array that can't enforce
"the org exists" or "the role is valid" and turns every "who can see this" query into an
array-containment scan.

## Enums vs lookup tables vs text + CHECK

Three ways to constrain a column to a fixed set of values, each with a different migration
story:

- **`create type task_status as enum (...)`** — cheapest to query and index, self-documenting
  in `\d`, but adding a value is a schema migration (`alter type ... add value`, which as of
  Postgres 12+ can run inside a transaction for the add itself, though you can't use the new
  value in the same transaction that added it) and removing or renaming a value has no
  built-in support at all — you rewrite the column. Lesson 109 covers this migration cost.
- **A lookup table** (`statuses(code primary key, label, sort_order)`) with a foreign key —
  adding a value is a plain `insert`, no migration, and you can attach metadata (a display
  label, a color, a sort order) to each value. Costs a join for anything that wants the
  label, and doesn't stop someone from inserting `'donee'` unless the foreign key is there.
- **`text` + `check (status in (...))`** — no join, but changing the set means dropping and
  re-adding the check constraint, and you get no metadata table to hang a label on.

This lesson uses enums for `membership_role`, `share_role`, and `task_status`, because the
exercise wants you to see the ergonomics; call out the migration tradeoff by name if asked
in an interview, and mention the lookup-table alternative unprompted — it signals you've
actually hit the "adding a status broke a migration" problem before.

## Invariants as constraints

Default every column to `not null` and justify the exceptions (`tasks.due_on` is genuinely
optional; `tasks.assignee_id` is optional until someone claims the task). Then encode
business rules as `check` constraints instead of application-layer `if` statements that a
second service, a backfill script, or a future you at 2am can forget to run:
`check (estimate_minutes >= 0)`, `check (length(title) between 1 and 200)`. A `check` runs on
every insert and update, from every writer, forever — that's the point.

**Soft deletes** (`deleted_at timestamptz null`, "deleted" means non-null) let you keep
history and support "restore" without a real `delete`. They cost you twice: every query that
shouldn't see deleted rows needs `where deleted_at is null` (easy to forget, especially in a
join), and a plain `unique` constraint stops working the way you want — if `projects(org_id,
name)` is unique and you soft-delete a project, you can't create a new project with that same
name because the old row is still there, just marked deleted. Lesson 108 covers the fix: a
partial unique index (`create unique index ... on projects(org_id, name) where deleted_at is
null`) that only enforces uniqueness among live rows.

**Audit columns** — `created_at`, `updated_at`, `created_by` — are cheap and you'll want them
on every mutable table. `created_at` and `created_by` are set once, at insert, and never
touched again. `updated_at` is trickier: relying on every writer to remember
`set updated_at = now()` fails the moment someone runs a raw `UPDATE` in a console or a new
service forgets the convention. A trigger fixes this at the database layer:

```sql
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_set_updated_at before update on projects
  for each row execute function set_updated_at();
```

PGlite ships `plpgsql` by default, so this trigger works exactly as it would against managed
Postgres — you'll write one in this lesson's first exercise.

## jsonb, and hierarchies vs graphs

Vendors on a hardware program often hand you payloads you don't fully control — a shipping
manifest, a custom field set from their own tracking tool. Modeling every possible key as a
column is a losing game; a `jsonb` column (`vendor_payload jsonb`) with a `GIN` index
(`create index ... using gin (vendor_payload)`, pointer to lesson 108) lets you store it
schemaless and still query into it (`vendor_payload @> '{"po_number": "1234"}'`) without a
migration every time a vendor adds a field. Don't reach for `jsonb` for data you do control
and query relationally — you lose `not null`, foreign keys, and cheap indexes on individual
fields.

Two different "this relates to that" shapes show up in this domain, and they want different
representations. A task's optional parent (a subtask under a larger task) is a **hierarchy**:
one `parent_task_id` column, self-referencing, forms a tree. A dependency ("task B can't
start until task A finishes") is a **graph**, not a tree — task B might depend on two tasks,
and a graph needs its own edge table (`task_dependencies(predecessor_id, successor_id)`) so a
single task can have multiple predecessors and multiple successors, which a single
self-referencing column can't express. A `check (predecessor_id <> successor_id)` on that
edge table stops the trivial self-loop; stopping a longer cycle (A depends on B depends on
A) needs a recursive check in application code or a `plpgsql` trigger walking the graph — a
plain constraint can't express "no cycle of any length," so cycle prevention lives above the
schema, not inside it.

## Further reading (optional)

- [PostgreSQL 17 documentation: Data Definition — Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL 17 documentation: Enumerated Types](https://www.postgresql.org/docs/current/datatype-enum.html)
- [PostgreSQL 17 documentation: gen_random_uuid()](https://www.postgresql.org/docs/current/functions-uuid.html)
- [PostgreSQL 17 documentation: Trigger Functions](https://www.postgresql.org/docs/current/plpgsql-trigger.html)
