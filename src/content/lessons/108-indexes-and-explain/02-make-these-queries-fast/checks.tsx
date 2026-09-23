import type { Check } from '../../../types';

const INDEX_SCAN = /Index Scan|Index Only Scan|Bitmap Heap Scan/;
const SEQ_SCAN_ON_TASKS = /Seq Scan on tasks/;

const queries: Array<{ label: string; sql: string }> = [
  {
    label: 'Q1',
    sql: `select * from tasks where project_id = 7 and status = 'todo' and deleted_at is null order by due_on limit 20`,
  },
  {
    label: 'Q2',
    sql: `select id, title, status, due_on from tasks where assignee_id = 42 and deleted_at is null`,
  },
  {
    label: 'Q3',
    sql: `select count(*) from tasks where created_at >= date '2026-09-01' and created_at < date '2026-10-01'`,
  },
  {
    label: 'Q4',
    sql: `select id, due_on from tasks where (due_on, id) > (date '2026-09-15', 100) order by due_on, id limit 50`,
  },
];

export const checks: Check[] = [
  ...queries.map(
    ({ label, sql }): Check => ({
      name: `${label} uses an index scan, not a sequential scan on tasks`,
      run: async ({ db, expect }) => {
        const plan = (await db.explain(sql)).join('\n');
        expect(plan, `plan for ${label}:\n${plan}`).to.match(INDEX_SCAN);
        expect(plan, `plan for ${label}:\n${plan}`).to.not.match(SEQ_SCAN_ON_TASKS);
      },
    }),
  ),
  {
    name: 'Q3 still returns the correct, seeded count',
    run: async ({ db, expect }) => {
      const r = await db.query<{ n: number }>(
        `select count(*)::int as n from tasks where created_at >= date '2026-09-01' and created_at < date '2026-10-01'`,
      );
      expect(r.rows[0]?.n).to.equal(1292);
    },
  },
  {
    // id=6 (g=6 in the seed) is the row with project_id = (6 % 50) + 1 = 7 and
    // title 'Task 6' — a real seeded (project_id, title) pair to collide with.
    name: 'a duplicate open title in the same project is rejected',
    run: async ({ db, expect }) => {
      let threw = false;
      try {
        await db.exec(`insert into tasks (project_id, assignee_id, status, title, created_at) values (7, 1, 'todo', 'Task 6', now())`);
      } catch {
        threw = true;
      }
      expect(threw, 'inserting a duplicate open (project_id, title) should raise a unique violation').to.equal(true);
    },
  },
  {
    name: 'a duplicate title is allowed once the earlier task is soft-deleted',
    run: async ({ db, expect }) => {
      await db.exec(`update tasks set deleted_at = now() where id = 6`);
      let threw = false;
      try {
        await db.exec(`insert into tasks (project_id, assignee_id, status, title, created_at) values (7, 1, 'todo', 'Task 6', now())`);
      } catch {
        threw = true;
      }
      expect(threw, 'a duplicate title should be allowed once the earlier task is soft-deleted').to.equal(false);
    },
  },
];
