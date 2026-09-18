import type { SqlDb } from '../../content/types';
import { splitStatements } from './split';

type PGliteLike = {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[]; fields: Array<{ name: string }> }>;
  close(): Promise<void>;
};

/**
 * Boot a fresh in-memory PostgreSQL (PGlite). The import is dynamic so the wasm bundle is
 * only fetched when a SQL exercise is opened in the browser; in Node it loads from node_modules.
 */
export async function createSqlDb(): Promise<SqlDb> {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = (await PGlite.create()) as unknown as PGliteLike;
  return {
    async query<T = Record<string, unknown>>(sql: string, params?: unknown[]) {
      const r = await pg.query<T>(sql, params);
      return { rows: r.rows, columns: r.fields.map((f) => f.name) };
    },
    async exec(sql: string) {
      for (const statement of splitStatements(sql)) {
        try {
          await pg.query(statement);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          throw new Error(`${message}\n  in statement: ${statement.length > 200 ? `${statement.slice(0, 200)}…` : statement}`);
        }
      }
    },
    async explain(sql: string) {
      const r = await pg.query<{ ['QUERY PLAN']: string }>(`explain (format text) ${sql}`);
      return r.rows.map((row) => row['QUERY PLAN']);
    },
    close: () => pg.close(),
  };
}
