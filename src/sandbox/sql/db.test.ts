// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createSqlDb } from './db';

describe('createSqlDb (PGlite)', () => {
  it('runs a script, queries with params, returns columns, and explains', { timeout: 60_000 }, async () => {
    const db = await createSqlDb();
    try {
      await db.exec(`
        create table tasks (id serial primary key, title text not null, done boolean default false);
        insert into tasks (title) values ('a'), ('b');
      `);
      const r = await db.query<{ id: number; title: string }>('select id, title from tasks where title = $1', ['b']);
      expect(r.rows).toEqual([{ id: 2, title: 'b' }]);
      expect(r.columns).toEqual(['id', 'title']);
      const plan = await db.explain('select * from tasks where id = 1');
      expect(plan.join('\n')).toMatch(/Seq Scan|Index Scan|Index Only Scan/);
    } finally {
      await db.close();
    }
  });

  it('exec throws on the first failing statement and reports it', { timeout: 60_000 }, async () => {
    const db = await createSqlDb();
    try {
      await expect(db.exec('select 1; select from_nowhere; select 2')).rejects.toThrow(/from_nowhere|syntax/i);
    } finally {
      await db.close();
    }
  });

  it('two databases are independent', { timeout: 60_000 }, async () => {
    const a = await createSqlDb();
    const b = await createSqlDb();
    try {
      await a.exec('create table only_in_a (x int)');
      await expect(b.query('select * from only_in_a')).rejects.toThrow(/does not exist/);
    } finally {
      await a.close();
      await b.close();
    }
  });
});
