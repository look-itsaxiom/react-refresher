-- Verdict rubric (see prompt.md for the full definitions):
--   safe                - no scan, no long/blocking lock; ship as-is
--   needs-lock-timeout   - brief ACCESS EXCLUSIVE lock; wrap in lock_timeout
--   rewrite-required     - full table rewrite, or a lock/scan proportional
--                           to table size; redesign instead of running as-is
--   unsafe                - breaks correctness or a live consumer regardless
--                           of how it's locked or timed

create or replace view migration_review as
select id as migration_id, verdict, reason
from (values
  (1, 'needs-lock-timeout', 'instant metadata change, but still takes ACCESS EXCLUSIVE momentarily; wrap in lock_timeout so it fails fast instead of queuing behind a long-running query'),
  (2, 'unsafe', 'no backfill first: will error on existing nulls, or silently rely on there being none'),
  (3, 'rewrite-required', 'plain CREATE INDEX blocks writers for the whole build on a 47m-row table; use CONCURRENTLY instead'),
  (4, 'safe', 'CONCURRENTLY does not block reads or writes; run it outside a transaction'),
  (5, 'safe', 'NOT VALID only checks new/updated rows; no table scan, no blocking lock'),
  (6, 'rewrite-required', 'int to bigint changes on-disk width: full table rewrite under ACCESS EXCLUSIVE for the duration'),
  (7, 'unsafe', 'still read by the deployed API; dropping it now breaks live requests regardless of locking'),
  (8, 'rewrite-required', 'single unbounded UPDATE: one long transaction, large WAL burst, no way to pause; batch it instead')
) as v(id, verdict, reason);

create or replace function next_batch(last_id int, size int)
returns table(id int) as $$
  select id from big_rows where id > last_id order by id limit size;
$$ language sql stable;

-- Bring orgs.slug to NOT NULL without a table-scanning lock or a hard
-- failure on the rows that don't have one yet.
update orgs set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
where slug is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orgs_slug_not_null_check' and conrelid = 'orgs'::regclass
  ) then
    alter table orgs add constraint orgs_slug_not_null_check
      check (slug is not null) not valid;
  end if;
end $$;

alter table orgs validate constraint orgs_slug_not_null_check;
alter table orgs alter column slug set not null;
alter table orgs drop constraint if exists orgs_slug_not_null_check;
