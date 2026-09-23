-- The "just ship it" version of this migration: it works against an empty
-- dev database, but it takes an ACCESS EXCLUSIVE lock, rewrites the whole
-- table, and breaks every deployed reader of estimate_minutes the instant
-- it commits. Replace it with the EXPAND phase only: add the new column
-- alongside the old one, keep both in sync, backfill in batches, validate
-- a constraint without a table-scanning lock, and keep the compatibility
-- view working. Do not drop estimate_minutes here — that's a later,
-- separate migration, once no deployed code reads it anymore.

alter table tasks
  add column estimate interval;

update tasks set estimate = make_interval(mins => estimate_minutes);

alter table tasks
  drop column estimate_minutes;
