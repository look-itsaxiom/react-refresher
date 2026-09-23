# Constraints are the API

A schema is a contract two things have to honor: every service that writes to it, and every
person who reads the DDL to understand what's actually true about the data. Application-layer
validation is a promise one codebase makes; a constraint is a promise the database keeps no
matter who's writing — a Go service, a background job, a hotfix run by hand in `psql`. When
you're interviewing for a system with a Go backend and a GraphQL layer in front of it, "the
schema is the source of truth, the API layer mirrors it" is the answer that shows you've
worked on a system where two services both wrote to the same tables and drifted.

## Foreign keys and ON DELETE, chosen per relationship

`on delete` isn't a single default you pick once — each foreign key needs its own answer to
"what should happen to the referencing row when the referenced row disappears?", from the
schema in the previous exercise:

- `projects.org_id → organizations.id` is `on delete restrict`: deleting an organization that
  still owns projects should fail loudly. There is no reasonable automatic behavior here —
  you don't want a company's departure to silently vaporize its projects, and you don't want
  the projects to become orphaned with a dangling reference either. Force a human (or a
  script that's actually thought about it) to reassign or archive the projects first.
- `tasks.project_id → projects.id` and `project_shares.project_id → projects.id` are
  `on delete cascade`: a project's tasks and shares have no meaning without the project, so
  deleting the project should take them with it.
- `tasks.assignee_id → users.id` is `on delete set null`: a user leaving the company shouldn't
  delete the tasks they were assigned, and it shouldn't be blocked by "can't delete this user,
  they have 40 tasks assigned" either — the task just becomes unassigned.
- `task_dependencies` cascades from both `predecessor_id` and `successor_id`: delete a task,
  its dependency edges go with it, in either direction.

The wrong default costs you differently depending on which way you're wrong. `restrict`
where you meant `cascade` means deletes fail mysteriously until someone traces the FK.
`cascade` where you meant `restrict` means a delete silently takes far more with it than the
person running it expected — this is the more dangerous mistake in a multi-tenant system,
because "delete this organization" cascading through shares, projects, and tasks that *other*
organizations also depend on is a data-loss incident, not a bug ticket.

**Deferrable constraints** let you postpone a foreign key or uniqueness check to the end of
the transaction instead of checking it after each statement: `references organizations(id)
deferrable initially deferred`. This matters when you need to insert two rows that reference
each other, or swap two unique values (`update projects set name = name || '-tmp'`, then swap)
without a constraint firing mid-transaction on a state that's only temporarily invalid. It's
uncommon in this schema — nothing here has a genuine circular reference — but it's worth
recognizing by name if it comes up.

## Uniqueness that respects soft deletes

`unique (org_id, name)` on `projects` looks right until you add `deleted_at`. Soft-delete a
project named "Radar Upgrade" and try to create a new one with the same name in the same org:
the old row, still `unique`-constrained, blocks it — the database can't tell "this name is
taken" from "this name *used to be* taken by a row nobody can see anymore." A plain `unique`
constraint has no concept of "only among the rows that matter." The fix is a partial unique
index that only indexes live rows:

```sql
create unique index projects_org_id_name_live_key
  on projects (org_id, name)
  where deleted_at is null;
```

Two soft-deleted projects can now share a name with each other and with a live one; only two
*live* rows in the same org can't. Lesson 108 covers partial indexes in more depth — for now,
recognize this as the standard fix whenever a `unique` constraint meets a `deleted_at` column,
and say so if a schema you're shown has both without it: it's a real bug, not a style
nitpick.

## EXCLUDE constraints for overlapping ranges

If this schema grew a `resource_bookings(resource_id, during tstzrange)` table — a piece of
test equipment booked by one task at a time — a `unique` constraint can't express "no two
bookings for the same resource may overlap in time," because uniqueness only compares for
exact equality, not overlap. Postgres's `exclude` constraint generalizes uniqueness to any
comparison operator:

```sql
create extension if not exists btree_gist;
alter table resource_bookings
  add constraint no_overlapping_bookings
  exclude using gist (resource_id with =, during with &&);
```

This isn't part of this lesson's exercises — PGlite's bundled extension set is worth checking
before you rely on `btree_gist` in the sandbox — but recognize the shape: `exclude` is the
tool for "these two things can't both be true for overlapping X," which comes up constantly
in scheduling.

## Row-level security, briefly

`project_shares` already lets you compute who can see a project with a join. Row-level
security (RLS) moves that filter into the database itself, so a query that forgets the `join`
still can't see rows it shouldn't:

```sql
alter table projects enable row level security;

create policy projects_visible_to_member_orgs on projects
  using (
    org_id = current_setting('app.current_org_id')::uuid
    or exists (
      select 1 from project_shares s
      where s.project_id = projects.id and s.org_id = current_setting('app.current_org_id')::uuid
    )
  );
```

The catch: RLS only works if the application actually sets `app.current_org_id` (via `set
local` inside the request's transaction) on every connection before querying — it's a
second enforcement layer, not a replacement for the application knowing who's asking. Skip it
if the app has a single trusted service role that always filters correctly and RLS would just
be redundant overhead; reach for it when multiple services, or a connection pool shared across
tenants, make "the app always filters correctly" a promise you can't fully verify.

## Normalization vs pragmatic denormalization

Normalize by default — a project's task count computed with `count(*)` from `tasks` is always
correct and costs one query. Denormalize deliberately, and narrowly, when a specific access
pattern needs it: a `projects.task_count int` counter column, kept in sync by a trigger on
`tasks`, avoids a `count(*)` scan on a dashboard that renders it for hundreds of projects at
once. A `path` column on a self-referencing hierarchy (materialized path, e.g.
`'/1/4/17/'`) turns "all descendants of this task" from a recursive CTE into a `like`
prefix scan. Both are real techniques and both mean: this value can now be wrong if the
trigger has a bug or the path isn't kept in sync on move — you've traded correctness-by-
construction for read speed, so say so explicitly if you introduce one.

## From schema to GraphQL and Go

The schema shapes the layers above it, and being able to trace that shape in an interview is
worth more than reciting SQL syntax: `task_status` the enum becomes a GraphQL `enum
TaskStatus` and a Go string-backed type with `iota`-free constants (`"todo"`, `"doing"`, ...)
— not a Go `iota` enum, because the wire format and the database value should be the same
string, not an integer that drifts if someone reorders the constants. A nullable
`assignee_id` becomes a nullable `assignee: User` field in GraphQL and a `*User` (or an
`AssigneeID sql.NullString`) in Go — the database's `not null` is the one place this
nullability is decided; don't re-derive it from a comment. `project_shares` becomes a
resolver-level authorization check as much as a data table: a GraphQL field resolver for
`project.tasks` should apply the same "member of the owning org, or a share exists" logic the
schema encodes, ideally by querying the same view rather than re-implementing the rule in
Go. Lessons 110 and 103 build on this directly.

## Naming conventions

Consistency here saves real time once a codebase has fifty tables: `snake_case` for
everything (Postgres folds unquoted identifiers to lowercase anyway, so mixed case just means
constant quoting); singular table names (`project`, not `projects`) is the other common
convention — this lesson uses plural, pick one per project and never mix them; foreign key
columns end in `_id` and match the referenced table's singular form
(`project_id references projects`); junction tables are named after both sides
(`project_shares`, not `sharing`); boolean columns read as a predicate (`is_active`, not
`active_flag`).

## Presenting a schema in an interview

Don't start with `CREATE TABLE`. Start with access patterns: "a user opens their dashboard
and needs every project they can see, across every org they belong to, including shared
ones" tells you `visible_projects` needs to union membership and shares before you've written
a column. Then state invariants in plain English before SQL: "a project belongs to exactly
one org," "a task can't depend on itself," "a share's role can only widen access, never
narrow it below what membership already grants" (if that's a rule your system needs — this
schema doesn't enforce it, which is itself worth naming as a gap). Then name your tradeoffs
out loud: "I used an enum for status because status values are fixed and load-bearing for
indexes; I'd reach for a lookup table if this needed per-tenant custom statuses." An
interviewer grading schema design is grading judgment under constraints, not constraint
syntax recall — show the judgment.

## Further reading (optional)

- [PostgreSQL 17 documentation: Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL 17 documentation: Exclusion Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION)
- [PostgreSQL 17 documentation: Partial Indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
