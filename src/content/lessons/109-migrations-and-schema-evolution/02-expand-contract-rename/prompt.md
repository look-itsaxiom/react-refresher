# Expand a live table, don't rewrite it

`tasks` stores estimates as `estimate_minutes` (an `int`). The product wants a real
`interval` column instead — better for display, math, and eventually partial-day
estimates. The API currently reads `estimate_minutes` through a view,
`legacy_api_tasks`, and that view is what the deployed frontend calls today.

The starter file is the "just ship it" migration: it rewrites the table under one lock
and drops `estimate_minutes` immediately, breaking `legacy_api_tasks` and every
in-flight request the instant it commits. Replace it with the **expand** phase only —
the part that's safe to run against a live table, with the old code path still live on
the other side of the deploy.

Your `query.sql` must, against the seeded `tasks` table:

1. Add a new nullable column, `estimate interval`, without dropping
   `estimate_minutes`.
2. Add a trigger so that inserting or updating a row through either column keeps the
   other one in sync: writing `estimate_minutes` sets `estimate` (and vice versa).
3. Backfill every existing row's `estimate` from its `estimate_minutes`, in batches
   of 10 rows at a time (a bounded loop, not one `UPDATE` with no `WHERE`).
4. Add `CHECK (estimate IS NULL OR estimate >= interval '0')` as `NOT VALID`, then
   `VALIDATE` it in a separate statement.
5. Recreate `legacy_api_tasks` so it still returns `estimate_minutes` (today's
   contract), alongside the new `estimate` column.

**Write it so the whole file can run twice without erroring** — guard the constraint
add with an existence check, use `IF NOT EXISTS` / `CREATE OR REPLACE` where they
apply. A migration runner that gets retried after a partial failure will run your file
again; it must survive that.

Do not drop `estimate_minutes` in this migration — that's a separate, later migration,
once no deployed code reads it anymore.
