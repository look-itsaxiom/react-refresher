Start with the column: `alter table tasks add column estimate interval;`. No default, so
it's a metadata-only change — instant, even on a large table.

---

The trigger needs to run `before insert or update`, and needs to tell the two
directions apart. On `INSERT` there's no `old` row to compare against, so check
`tg_op = 'INSERT'` separately from the `UPDATE` branch, which can compare `new.x is
distinct from old.x` to see which column the caller actually touched.
`make_interval(mins => n)` converts minutes to an interval;
`extract(epoch from iv) / 60` converts back (round it to a whole number of minutes).

---

The batched backfill is a `do $$ ... $$` block with a loop: run an `UPDATE ... WHERE
id IN (SELECT id FROM tasks WHERE estimate IS NULL AND estimate_minutes IS NOT NULL
LIMIT 10)`, check `GET DIAGNOSTICS updated = ROW_COUNT`, and `EXIT WHEN updated = 0`.

---

`ADD CONSTRAINT` isn't idempotent on its own — running it twice errors with "constraint
already exists". Wrap it in `do $$ begin if not exists (select 1 from pg_constraint
where conname = '...' and conrelid = 'tasks'::regclass) then alter table tasks add
constraint ... not valid; end if; end $$;`, then call `alter table tasks validate
constraint ...;` as its own statement, outside the `do` block, every time — validating
an already-valid constraint is a cheap no-op, so it doesn't need the same guard.

---

`create or replace view legacy_api_tasks as select id, title, estimate_minutes,
estimate from tasks;` is idempotent by construction — `create or replace` never
complains about an existing view, as long as you don't remove a column a dependent
object needs.
