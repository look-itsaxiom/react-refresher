import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'task_ancestors: every ancestor at every depth, not just the direct parent',
    run: async ({ db, expect }) => {
      const r = await db.query('select task_id, ancestor_id, depth from task_ancestors order by task_id, depth, ancestor_id');
      expect(r.rows).to.deep.equal([
        { task_id: 101, ancestor_id: 100, depth: 1 },
        { task_id: 102, ancestor_id: 100, depth: 1 },
        { task_id: 103, ancestor_id: 101, depth: 1 },
        { task_id: 103, ancestor_id: 100, depth: 2 },
        { task_id: 104, ancestor_id: 101, depth: 1 },
        { task_id: 104, ancestor_id: 100, depth: 2 },
        { task_id: 105, ancestor_id: 102, depth: 1 },
        { task_id: 105, ancestor_id: 100, depth: 2 },
        { task_id: 106, ancestor_id: 102, depth: 1 },
        { task_id: 106, ancestor_id: 100, depth: 2 },
        { task_id: 110, ancestor_id: 109, depth: 1 },
        { task_id: 111, ancestor_id: 110, depth: 1 },
        { task_id: 111, ancestor_id: 109, depth: 2 },
      ]);
      // the two roots have no ancestors at all
      const roots = await db.query('select task_id from task_ancestors where task_id in (100, 109)');
      expect(roots.rows).to.deep.equal([]);
    },
  },
  {
    name: 'ready_tasks: status todo, and EVERY predecessor done (or none at all)',
    run: async ({ db, expect }) => {
      const r = await db.query('select id, title from ready_tasks order by id');
      expect(r.rows).to.deep.equal([
        { id: 3, title: 'Task 3' },
        { id: 5, title: 'Task 5' },
        { id: 9, title: 'Task 9' },
        { id: 12, title: 'Task 12' },
      ]);
    },
  },
  {
    name: 'critical_path: the longest predecessor path per task, including through the diamond at task 4',
    run: async ({ db, expect }) => {
      const r = await db.query('select task_id, path, total_minutes from critical_path order by task_id');
      expect(r.rows).to.deep.equal([
        { task_id: 1, path: [1], total_minutes: 30 },
        { task_id: 2, path: [1, 2], total_minutes: 80 },
        { task_id: 3, path: [1, 3], total_minutes: 50 },
        { task_id: 4, path: [1, 2, 4], total_minutes: 120 },
        { task_id: 5, path: [5], total_minutes: 25 },
        { task_id: 6, path: [5, 6], total_minutes: 60 },
        { task_id: 7, path: [5, 6, 7], total_minutes: 105 },
        { task_id: 8, path: [8], total_minutes: 15 },
        { task_id: 9, path: [8, 9], total_minutes: 70 },
        { task_id: 10, path: [8, 9, 10], total_minutes: 95 },
        { task_id: 11, path: [8, 9, 10, 11], total_minutes: 160 },
        { task_id: 12, path: [12], total_minutes: 20 },
      ]);
    },
  },
  {
    name: 'shipments_by_vendor: only "shipment" events, summing item quantities not counting items',
    run: async ({ db, expect }) => {
      const r = await db.query('select vendor, shipments, total_qty from shipments_by_vendor order by vendor');
      expect(r.rows).to.deep.equal([
        { vendor: 'Acme', shipments: 2, total_qty: 10 },
        { vendor: 'Orbital', shipments: 2, total_qty: 12 },
        { vendor: 'Zenith', shipments: 1, total_qty: 7 },
      ]);
    },
  },
];
