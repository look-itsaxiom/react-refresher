import type { Check } from '../../../types';

const expectedDiagnosis: Record<number, { smell: string; fix: string }> = {
  1: { smell: 'seq-scan-large', fix: 'add-index' },
  2: { smell: 'row-estimate-off', fix: 'analyze' },
  3: { smell: 'sort-spill', fix: 'increase-work_mem-or-index' },
  4: { smell: 'nested-loop-inner-seq', fix: 'rewrite-join' },
  5: { smell: 'fine', fix: 'none' },
};

export const checks: Check[] = [
  {
    name: 'plan_diagnosis has exactly one row per plan, in the right order',
    run: async ({ db, expect }) => {
      const r = await db.query<{ plan_id: number }>(`select plan_id from plan_diagnosis order by plan_id`);
      expect(r.rows.map((row) => row.plan_id)).to.deep.equal([1, 2, 3, 4, 5]);
    },
  },
  ...Object.entries(expectedDiagnosis).map(
    ([id, { smell, fix }]): Check => ({
      name: `plan ${id} is diagnosed as ${smell} / ${fix}`,
      run: async ({ db, expect }) => {
        const r = await db.query<{ smell: string; fix: string }>(
          `select smell, fix from plan_diagnosis where plan_id = ${id}`,
        );
        expect(r.rows, `expected exactly one row for plan_id ${id}`).to.have.length(1);
        expect(r.rows[0]?.smell).to.equal(smell);
        expect(r.rows[0]?.fix).to.equal(fix);
      },
    }),
  ),
  {
    name: 'vendor_events.payload has a GIN index',
    run: async ({ db, expect }) => {
      const r = await db.query<{ indexdef: string }>(
        `select indexdef from pg_indexes where tablename = 'vendor_events'`,
      );
      const hasGin = r.rows.some((row) => /using gin/i.test(row.indexdef));
      expect(hasGin, `pg_indexes for vendor_events:\n${r.rows.map((row) => row.indexdef).join('\n')}`).to.equal(true);
    },
  },
  {
    name: 'jsonb_events_by_vendor returns the correct ids for a known vendor',
    run: async ({ db, expect }) => {
      const r = await db.query<{ n: number }>(`select count(*)::int as n from jsonb_events_by_vendor('v5')`);
      expect(r.rows[0]?.n).to.equal(200);
      const none = await db.query<{ n: number }>(`select count(*)::int as n from jsonb_events_by_vendor('no-such-vendor')`);
      expect(none.rows[0]?.n).to.equal(0);
    },
  },
  {
    name: 'the query behind jsonb_events_by_vendor uses the GIN index (Bitmap Index Scan), not a sequential scan',
    run: async ({ db, expect }) => {
      const plan = (await db.explain(`select * from jsonb_events_by_vendor('v5')`)).join('\n');
      expect(plan, `plan:\n${plan}`).to.match(/Bitmap Index Scan|Index Scan/);
      expect(plan, `plan:\n${plan}`).to.not.match(/Seq Scan on vendor_events/);
    },
  },
];
