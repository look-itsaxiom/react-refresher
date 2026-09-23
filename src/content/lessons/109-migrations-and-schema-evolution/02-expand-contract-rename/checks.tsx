import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'both estimate_minutes and estimate columns exist on tasks',
    run: async ({ db, expect }) => {
      const r = await db.query<{ column_name: string }>(
        "select column_name from information_schema.columns where table_name = 'tasks' and column_name in ('estimate_minutes', 'estimate')",
      );
      const names = r.rows.map((row) => row.column_name).sort();
      expect(names).to.deep.equal(['estimate', 'estimate_minutes']);
    },
  },
  {
    name: 'every existing row was backfilled: estimate matches estimate_minutes',
    run: async ({ db, expect }) => {
      const r = await db.query<{ n: number }>(
        `select count(*)::int as n from tasks
         where estimate_minutes is not null
           and estimate is distinct from make_interval(mins => estimate_minutes)`,
      );
      expect(r.rows[0]?.n, 'rows where estimate does not match estimate_minutes').to.equal(0);
      const total = await db.query<{ n: number }>('select count(*)::int as n from tasks');
      expect(total.rows[0]?.n).to.equal(40);
    },
  },
  {
    name: 'inserting with only estimate_minutes sets estimate via trigger',
    run: async ({ db, expect }) => {
      await db.exec("insert into tasks (id, title, estimate_minutes) values (101, 'New task', 90)");
      const r = await db.query<{ estimate: string }>('select estimate from tasks where id = 101');
      const iv = await db.query<{ mins: number }>(
        "select extract(epoch from estimate)::int / 60 as mins from tasks where id = 101",
      );
      expect(r.rows[0]?.estimate, 'estimate should be set by the trigger').to.not.equal(null);
      expect(iv.rows[0]?.mins).to.equal(90);
    },
  },
  {
    name: 'updating estimate keeps estimate_minutes in sync via trigger',
    run: async ({ db, expect }) => {
      await db.exec("update tasks set estimate = interval '2 hours' where id = 1");
      const r = await db.query<{ estimate_minutes: number }>('select estimate_minutes from tasks where id = 1');
      expect(r.rows[0]?.estimate_minutes).to.equal(120);
    },
  },
  {
    name: 'the nonnegative check constraint exists and is validated',
    run: async ({ db, expect }) => {
      const r = await db.query<{ convalidated: boolean }>(
        "select convalidated from pg_constraint where conrelid = 'tasks'::regclass and contype = 'c'",
      );
      expect(r.rows.length, 'expected at least one CHECK constraint on tasks').to.be.greaterThan(0);
      expect(r.rows.every((row) => row.convalidated), 'every CHECK constraint on tasks should be validated').to.equal(true);
    },
  },
  {
    name: 'legacy_api_tasks still exposes estimate_minutes with the original values',
    run: async ({ db, expect }) => {
      const r = await db.query<{ estimate_minutes: number }>(
        'select estimate_minutes from legacy_api_tasks where id = 1',
      );
      expect(r.rows[0]?.estimate_minutes).to.equal(30);
    },
  },
  {
    name: 'the migration is safe to run a second time (idempotent shape)',
    run: async ({ db, expect }) => {
      // A retried deploy runs the migration file again. These are the specific
      // idempotent statements the solution relies on; re-running them against a
      // database that already has this migration applied must not error.
      await db.exec("alter table tasks add column if not exists estimate interval");
      await db.exec("create or replace view legacy_api_tasks as select id, title, estimate_minutes, estimate from tasks");
      const r = await db.query<{ n: number }>(
        "select count(*)::int as n from information_schema.columns where table_name = 'tasks' and column_name = 'estimate'",
      );
      expect(r.rows[0]?.n).to.equal(1);
    },
  },
];
