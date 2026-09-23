import type { Check } from '../../../types';

const EXPECTED_VERDICTS: Record<number, string> = {
  1: 'needs-lock-timeout',
  2: 'unsafe',
  3: 'rewrite-required',
  4: 'safe',
  5: 'safe',
  6: 'rewrite-required',
  7: 'unsafe',
  8: 'rewrite-required',
};

export const checks: Check[] = [
  {
    name: 'migration_review has one verdict row per migration, matching the rubric',
    run: async ({ db, expect }) => {
      const r = await db.query<{ migration_id: number; verdict: string; reason: string }>(
        'select migration_id, verdict, reason from migration_review order by migration_id',
      );
      expect(r.rows.length, 'expected 8 rows, one per migration').to.equal(8);
      for (const row of r.rows) {
        expect(row.reason, `migration ${row.migration_id} needs a non-empty reason`).to.be.a('string').and.not.equal('');
        expect(
          row.verdict,
          `migration ${row.migration_id} ("${row.reason}")`,
        ).to.equal(EXPECTED_VERDICTS[row.migration_id]);
      }
    },
  },
  {
    name: 'migration_review only uses the four documented verdicts',
    run: async ({ db, expect }) => {
      const r = await db.query<{ verdict: string }>('select distinct verdict from migration_review');
      const allowed = new Set(['safe', 'needs-lock-timeout', 'rewrite-required', 'unsafe']);
      for (const row of r.rows) {
        expect(allowed.has(row.verdict), `unexpected verdict "${row.verdict}"`).to.equal(true);
      }
    },
  },
  {
    name: 'next_batch pages through big_rows in order, keyed on id',
    run: async ({ db, expect }) => {
      const first = await db.query<{ id: number }>('select id from next_batch(0, 10) order by id');
      expect(first.rows.map((r) => r.id)).to.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      const second = await db.query<{ id: number }>('select id from next_batch(10, 10) order by id');
      expect(second.rows.map((r) => r.id)).to.deep.equal([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);

      const last = await db.query<{ id: number }>('select id from next_batch(45, 10) order by id');
      expect(last.rows.map((r) => r.id)).to.deep.equal([46, 47]);

      const exhausted = await db.query<{ id: number }>('select id from next_batch(47, 10)');
      expect(exhausted.rows).to.deep.equal([]);
    },
  },
  {
    name: 'orgs.slug is NOT NULL with every row backfilled and no nulls remaining',
    run: async ({ db, expect }) => {
      const col = await db.query<{ is_nullable: string }>(
        "select is_nullable from information_schema.columns where table_name = 'orgs' and column_name = 'slug'",
      );
      expect(col.rows[0]?.is_nullable, 'orgs.slug should be NOT NULL').to.equal('NO');

      const rows = await db.query<{ id: number; slug: string }>('select id, slug from orgs order by id');
      expect(rows.rows.every((r) => r.slug !== null && r.slug !== '')).to.equal(true);
      expect(rows.rows.find((r) => r.id === 1)?.slug).to.equal('acme');
      expect(rows.rows.find((r) => r.id === 4)?.slug).to.equal('delta-llc');
      // Backfilled from the org name, not left blank or hardcoded.
      expect(rows.rows.find((r) => r.id === 2)?.slug).to.equal('bolt-co');
      expect(rows.rows.find((r) => r.id === 3)?.slug).to.equal('circle-inc');
    },
  },
  {
    name: 'the temporary NOT NULL check constraint was dropped after validating',
    run: async ({ db, expect }) => {
      const r = await db.query<{ n: number }>(
        "select count(*)::int as n from pg_constraint where conrelid = 'orgs'::regclass and contype = 'c'",
      );
      expect(r.rows[0]?.n, 'no CHECK constraints should remain on orgs once slug is NOT NULL').to.equal(0);
    },
  },
];
