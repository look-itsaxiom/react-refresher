// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { runSqlChecks, runSqlScript } from './runSqlChecks';
import type { Check } from '../../content/types';

const seed = 'create table tasks (id int primary key, title text); insert into tasks values (1, \'a\'), (2, \'b\');';

describe('runSqlChecks', () => {
  it('applies seed then entry, gives each check a fresh db, and reports pass/fail', { timeout: 60_000 }, async () => {
    const checks: Check[] = [
      { name: 'row was inserted', run: async ({ db, expect }) => {
        const r = await db.query<{ n: number }>('select count(*)::int as n from tasks');
        expect(r.rows[0]?.n).to.equal(3);
      } },
      { name: 'fresh db per check', run: async ({ db, expect }) => {
        await db.exec('insert into tasks values (99, \'z\')');
        const r = await db.query<{ n: number }>('select count(*)::int as n from tasks');
        expect(r.rows[0]?.n).to.equal(4); // 3 + 1, not 5
      } },
      { name: 'schema was reset, not shared, after the previous check', run: async ({ db, expect }) => {
        // If the database (or its public schema) were reused without a reset, this would
        // see the row inserted by the previous check and count 5 instead of the seeded 3.
        const r = await db.query<{ n: number }>('select count(*)::int as n from tasks');
        expect(r.rows[0]?.n).to.equal(3);
      } },
      { name: 'deliberately failing', run: async ({ expect }) => { expect(1).to.equal(2); } },
    ];
    const out = await runSqlChecks({
      files: { 'seed.sql': seed, 'query.sql': "insert into tasks values (3, 'c');" },
      checks,
    });
    expect(out.results.map((r) => r.status)).toEqual(['pass', 'pass', 'pass', 'fail']);
    expect(out.allPassed).toBe(false);
    expect(out.results[3]?.error).toMatch(/expected 1 to equal 2/);
  });

  it('a failing statement in the entry fails every check with the SQL error', { timeout: 60_000 }, async () => {
    const out = await runSqlChecks({
      files: { 'query.sql': 'select * from nope;' },
      checks: [{ name: 'a', run: () => {} }, { name: 'b', run: () => {} }],
    });
    expect(out.results.every((r) => r.status === 'fail')).toBe(true);
    expect(out.results[0]?.error).toMatch(/does not exist/);
  });

  it('a failed database boot fails every check with the boot error, not just the first', async () => {
    const createDb = async (): Promise<never> => { throw new Error('pglite boot exploded'); };
    const checks: Check[] = [
      { name: 'a', run: () => {} },
      { name: 'b', run: () => {} },
      { name: 'c', run: () => {} },
    ];
    const out = await runSqlChecks({ files: { 'query.sql': 'select 1' }, checks, createDb });
    expect(out.results).toHaveLength(3);
    expect(out.results.map((r) => r.name)).toEqual(['a', 'b', 'c']);
    for (const r of out.results) {
      expect(r.status).toBe('fail');
      expect(r.error).toMatch(/pglite boot exploded/);
    }
    expect(out.allPassed).toBe(false);
  });

  it('a failed database boot with no checks reports no results and allPassed true', async () => {
    const createDb = async (): Promise<never> => { throw new Error('pglite boot exploded'); };
    const out = await runSqlChecks({ files: { 'query.sql': 'select 1' }, checks: [], createDb });
    expect(out.results).toEqual([]);
    expect(out.allPassed).toBe(true);
  });

  it('runSqlScript returns the last statement result for the preview grid', { timeout: 60_000 }, async () => {
    const r = await runSqlScript({ 'seed.sql': seed, 'query.sql': 'select title from tasks order by id' }, 'query.sql');
    expect(r.error).toBeNull();
    expect(r.columns).toEqual(['title']);
    expect(r.rows).toEqual([{ title: 'a' }, { title: 'b' }]);
    const bad = await runSqlScript({ 'query.sql': 'selec 1' }, 'query.sql');
    expect(bad.error).toMatch(/syntax/i);
  });
});
