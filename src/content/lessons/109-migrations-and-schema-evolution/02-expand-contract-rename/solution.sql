-- EXPAND phase only. Every statement here is safe to run against a live
-- table and safe to re-run if the deploy retries this migration.

-- 1. Add the new column, nullable, no default: metadata-only, instant.
alter table tasks add column if not exists estimate interval;

-- 2. Dual-write trigger: whichever column a writer touches, keep the
--    other one in sync, so code still writing estimate_minutes and code
--    already migrated to estimate can both run during the rollout.
create or replace function sync_tasks_estimate() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.estimate is null and new.estimate_minutes is not null then
      new.estimate := make_interval(mins => new.estimate_minutes);
    elsif new.estimate is not null and new.estimate_minutes is null then
      new.estimate_minutes := round(extract(epoch from new.estimate) / 60)::int;
    end if;
    return new;
  end if;

  if new.estimate_minutes is distinct from old.estimate_minutes
     and new.estimate is not distinct from old.estimate then
    new.estimate := make_interval(mins => new.estimate_minutes);
  elsif new.estimate is distinct from old.estimate
     and new.estimate_minutes is not distinct from old.estimate_minutes then
    new.estimate_minutes := round(extract(epoch from new.estimate) / 60)::int;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_tasks_estimate on tasks;
create trigger trg_sync_tasks_estimate
  before insert or update on tasks
  for each row execute function sync_tasks_estimate();

-- 3. Backfill existing rows in bounded batches instead of one
--    stop-the-world UPDATE.
do $$
declare
  updated int;
begin
  loop
    update tasks set estimate = make_interval(mins => estimate_minutes)
    where id in (
      select id from tasks
      where estimate is null and estimate_minutes is not null
      limit 10
    );
    get diagnostics updated = row_count;
    exit when updated = 0;
  end loop;
end $$;

-- 4. Add the constraint we actually want without a table-scanning lock:
--    NOT VALID first (checked for new/updated rows only), then a
--    separate VALIDATE pass. Guarded so re-running this file doesn't
--    fail on "constraint already exists".
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'estimate_nonnegative' and conrelid = 'tasks'::regclass
  ) then
    alter table tasks add constraint estimate_nonnegative
      check (estimate is null or estimate >= interval '0') not valid;
  end if;
end $$;

alter table tasks validate constraint estimate_nonnegative;

-- 5. Recreate the compatibility view so today's deployed readers of
--    estimate_minutes keep working, while exposing the new column too.
create or replace view legacy_api_tasks as
select id, title, estimate_minutes, estimate from tasks;
