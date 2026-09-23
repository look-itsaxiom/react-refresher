import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'project_progress: total, done, and a rounded-to-1-decimal done_pct per project',
    run: async ({ db, expect }) => {
      const r = await db.query('select project_id, name, total, done, done_pct from project_progress order by project_id');
      expect(r.rows).to.deep.equal([
        { project_id: 1, name: 'Aurora', total: 10, done: 4, done_pct: '40.0' },
        { project_id: 2, name: 'Borealis', total: 10, done: 4, done_pct: '40.0' },
        { project_id: 3, name: 'Cascade', total: 10, done: 4, done_pct: '40.0' },
      ]);
    },
  },
  {
    name: 'assignee_load: includes an assignee with zero open tasks (Eve) at 0, not dropped, ordered by open_minutes desc',
    run: async ({ db, expect }) => {
      const r = await db.query('select assignee_id, name, open_tasks, open_minutes from assignee_load order by open_minutes desc, assignee_id');
      expect(r.rows).to.deep.equal([
        { assignee_id: 2, name: 'Bob', open_tasks: 5, open_minutes: 315 },
        { assignee_id: 4, name: 'Dave', open_tasks: 4, open_minutes: 300 },
        { assignee_id: 3, name: 'Carol', open_tasks: 5, open_minutes: 250 },
        { assignee_id: 1, name: 'Alice', open_tasks: 4, open_minutes: 225 },
        { assignee_id: 5, name: 'Eve', open_tasks: 0, open_minutes: 0 },
      ]);
    },
  },
  {
    name: 'overdue_tasks: only tasks that are not done and past due, with correct days_overdue',
    run: async ({ db, expect }) => {
      const r = await db.query('select id, title, project_id, days_overdue from overdue_tasks order by id');
      expect(r.rows).to.deep.equal([
        { id: 3, title: 'Task 3', project_id: 1, days_overdue: 6 },
        { id: 5, title: 'Task 5', project_id: 1, days_overdue: 3 },
        { id: 8, title: 'Task 8', project_id: 1, days_overdue: 1 },
        { id: 12, title: 'Task 12', project_id: 2, days_overdue: 2 },
        { id: 16, title: 'Task 16', project_id: 2, days_overdue: 4 },
        { id: 19, title: 'Task 19', project_id: 2, days_overdue: 5 },
        { id: 23, title: 'Task 23', project_id: 3, days_overdue: 7 },
        { id: 25, title: 'Task 25', project_id: 3, days_overdue: 2 },
        { id: 28, title: 'Task 28', project_id: 3, days_overdue: 6 },
      ]);
    },
  },
  {
    name: 'latest_status: the most recent status_changes row per task, not the earliest',
    run: async ({ db, expect }) => {
      const r = await db.query(
        "select task_id, status, changed_at from latest_status where task_id in (1, 2, 5, 10, 16) order by task_id",
      );
      expect(r.rows).to.deep.equal([
        { task_id: 1, status: 'done', changed_at: new Date('2026-09-14T12:00:00Z') },
        { task_id: 2, status: 'in_progress', changed_at: new Date('2026-08-31T09:00:00Z') },
        { task_id: 5, status: 'in_progress', changed_at: new Date('2026-09-03T09:00:00Z') },
        { task_id: 10, status: 'done', changed_at: new Date('2026-09-16T09:00:00Z') },
        { task_id: 16, status: 'in_progress', changed_at: new Date('2026-09-04T09:00:00Z') },
      ]);
      const count = await db.query<{ n: number }>('select count(*)::int as n from latest_status');
      expect(count.rows[0]?.n).to.equal(30);
    },
  },
  {
    name: 'daily_completions: per-day completions and a true running total, in day order',
    run: async ({ db, expect }) => {
      const r = await db.query('select day, completed, running_total from daily_completions order by day');
      expect(r.rows).to.deep.equal([
        { day: new Date('2026-09-14T00:00:00Z'), completed: 2, running_total: 2 },
        { day: new Date('2026-09-15T00:00:00Z'), completed: 1, running_total: 3 },
        { day: new Date('2026-09-16T00:00:00Z'), completed: 2, running_total: 5 },
        { day: new Date('2026-09-17T00:00:00Z'), completed: 3, running_total: 8 },
        { day: new Date('2026-09-18T00:00:00Z'), completed: 1, running_total: 9 },
        { day: new Date('2026-09-19T00:00:00Z'), completed: 1, running_total: 10 },
        { day: new Date('2026-09-20T00:00:00Z'), completed: 2, running_total: 12 },
      ]);
    },
  },
];
