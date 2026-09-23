Start from the enums — `create type membership_role as enum ('owner', 'admin', 'member',
'viewer');` — before any table that references them. `create type` has to run before the
column that uses the type as its data type.

---

`uuid primary key default gen_random_uuid()` needs no extension in Postgres 13+; PGlite
bundles it. Swap every `serial primary key` for that, and every `int` foreign key column for
`uuid`.

---

A composite primary key has no separate `id` column at all: `primary key (user_id, org_id)`
as a table-level constraint, not `id serial primary key` plus two foreign keys.

---

`on delete restrict` on `projects.org_id → organizations.id` is what makes deleting an
organization that still owns a project fail loudly instead of silently cascading. `on delete
cascade` on `tasks.project_id → projects.id` is the opposite choice: deleting a project
should take its tasks with it.

---

The trigger needs two pieces: the function (`language plpgsql`, sets
`new.updated_at = now()`, `return new;`) and a `create trigger ... before update on ...
for each row execute function set_updated_at();` on each of `projects` and `tasks`. Forgetting
`for each row` (defaulting to a statement-level trigger) means `new` isn't available in the
function body and the trigger creation itself will fail.
