# Migrations as code

You already know the destination: a schema, described in a migration tool's format, checked
into the repo next to the code that depends on it. What matters for an interview is knowing
*why* every part of that sentence is load-bearing, and being able to talk through what happens
when a migration touches a table that's serving traffic. [[93-release-safety]] covered
expand/contract as the rollback story for application code; this lesson is the schema side of
the same problem.

## The shape every tool converges on

Whatever tool you pick — `golang-migrate`, `pressly/goose`, `sqitch`, Prisma/Drizzle on a
TypeScript backend, or Atlas's declarative diffing — you get the same three pieces:

- **Versioned, forward-only files.** Each migration is a small, numbered SQL (or
  tool-specific) file: `0032_add_estimate_column.up.sql`. It runs once, in order, and is
  never edited after it ships — if you got it wrong, you write a new migration that fixes it.
  Editing a migration that already ran in production is how you get environments that silently
  disagree about their own history.
- **A migrations table.** The tool creates its own bookkeeping table (`schema_migrations` for
  `golang-migrate`, `goose_db_version` for `goose`) that records which versions have run. That
  table is the source of truth for "is this database caught up" — not a comment, not a wiki
  page.
- **A runner that's part of the deploy, not a manual step.** In a Go service this is usually
  `embed.FS` plus `golang-migrate`'s `iofs` source: the `.sql` files are compiled into the
  binary, and a small `main` (or an init container, or a dedicated `migrate` subcommand) applies
  pending migrations before the service starts serving. That's the piece worth being able to
  sketch on a whiteboard: embed the directory, open a `migrate.Migrate` against the Postgres
  DSN and the embedded source, call `.Up()`, check for `migrate.ErrNoChange` (not a real
  error — it just means nothing was pending).

`goose` and `sqitch` are close cousins of the same up/down-file model. Atlas is a different
philosophy: you declare the schema you *want* (as HCL or introspected SQL) and it diffs that
against the live database to generate the migration, rather than you hand-writing each step.
Prisma and Drizzle bring the same declarative-diff idea to a TypeScript stack, generating SQL
from a schema file. For an interview where the backend is Go, `golang-migrate` or `goose` are
the ones worth being fluent in; know that Atlas exists and what problem it solves (drift
detection, mostly) even if you haven't driven it.

## One migration, one change

Resist the urge to bundle three schema changes into one file because they landed in the same PR.
A migration that adds a column, backfills it, and adds a constraint in one script is fine when
the table is small and the deploy has a maintenance window. On a live table, those need to be
separable — see the next section for why — so the habit of "one migration, one change" pays off
long before you hit that table.

Idempotency matters for a narrower reason than it sounds: it's not about being allowed to run a
migration twice by design (the migrations table already prevents that), it's about surviving a
migration that failed halfway — a deploy that crashed mid-`Up()`, a runner that got retried by an
orchestrator that doesn't know Postgres already applied half the file. `create table if not
exists`, `add column if not exists`, and guarding a `create constraint` with a
`pg_constraint` existence check in a `do $$ ... $$` block are the difference between "restart the
job" and "SSH in and hand-fix the schema."

## Down migrations vs. rolling forward

Most tools support a paired `.down.sql`. The honest industry answer, and the one worth giving in
an interview, is that down migrations are rarely run in production and rot if you don't test
them — a `down` that drops a column you already backfilled loses data, silently, the one time
someone actually runs it. Teams that take this seriously either delete the data-destructive half
of `down` and replace it with a no-op plus a comment explaining why, or drop down migrations
entirely and commit to "roll forward": if a migration causes a problem, the fix is a new
migration, not reversing history. Keep `down` around for genuinely reversible changes (an added
nullable column, an index) and stop pretending it's a safety net for anything that touched data.

## Transactional DDL, and what escapes it

Postgres wraps most DDL in the surrounding transaction, which is unusual — MySQL can't do this at
all. A migration file that runs three `ALTER TABLE` statements either all commit or all roll
back if the fourth fails. Two things opt out of that safety net and matter enough to name
directly: `CREATE INDEX CONCURRENTLY` refuses to run inside a transaction block at all (more on
why in the next section), and `ALTER TYPE ... ADD VALUE` for an enum, while it *can* run inside a
transaction as of Postgres 12, can't have its new value read by anything in that same
transaction — a later statement in the same script that tries to use the value it just added
will error. Both are reasons migration files that touch either one are usually split into their
own file, run outside whatever wraps the rest.

## Where this runs, and what runs there

CI applies migrations against a throwaway or preview database as a correctness gate — this is
also where schema drift gets caught, by diffing the live schema against what the migration files
would produce. In deploy, the expand/contract answer from [[93-release-safety]] applies directly
to ordering: migrations run *before* the new code deploys when the change only adds things (new
column, new table), and the old code must tolerate the new shape running underneath it for the
length of the rollout. A column only gets dropped in a later migration, after the code that
stopped reading it has been live for a full deploy cycle. Seeding — inserting reference data
like a default plan tier or a list of countries — is a different operation from migrating the
shape, even though some tools blur the line; keep seed data in its own script or a separate
`goose seed` step, not interleaved with schema changes, so a fresh preview database (a Neon
branch — see the environments lessons) can be seeded independently of which migrations have run.

## Further reading (optional)

- [PostgreSQL: DDL and transactions](https://www.postgresql.org/docs/current/ddl-schemas.html)
- [golang-migrate](https://github.com/golang-migrate/migrate)
- [pressly/goose](https://github.com/pressly/goose)
- [Atlas — a database schema as code tool](https://atlasgo.io/)
