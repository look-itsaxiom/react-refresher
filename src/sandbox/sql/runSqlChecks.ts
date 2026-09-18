import { expect } from 'chai';
import type { Check, CheckContext, SqlDb } from '../../content/types';
import type { CheckResult } from '../protocol';
import { controls } from '../server/core';
import { formatError } from '../runner';
import { createSqlDb } from './db';
import { splitStatements } from './split';

export const DEFAULT_SQL_ENTRY = 'query.sql';
const DEFAULT_TIMEOUT_MS = 10_000;

export type SqlRunOutcome = { kind: 'results'; results: CheckResult[]; allPassed: boolean };

export type SqlScriptResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  error: string | null;
  statements: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Check timed out after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e: unknown) => { clearTimeout(t); reject(e); });
  });
}

/** Run seed.sql (if present) then the entry script. Throws with the failing statement on error. */
async function applyFiles(db: SqlDb, files: Record<string, string>, entry: string): Promise<number> {
  let count = 0;
  const seed = files['seed.sql'];
  if (seed) { await db.exec(seed); count += splitStatements(seed).length; }
  const script = files[entry];
  if (script === undefined) throw new Error(`Entry file '${entry}' not found`);
  await db.exec(script);
  count += splitStatements(script).length;
  return count;
}

/** For the preview pane: run the files and return the result of the entry's last statement. */
export async function runSqlScript(
  files: Record<string, string>,
  entry: string = DEFAULT_SQL_ENTRY,
  createDb: () => Promise<SqlDb> = createSqlDb,
): Promise<SqlScriptResult> {
  const db = await createDb();
  try {
    const seed = files['seed.sql'];
    if (seed) await db.exec(seed);
    const statements = splitStatements(files[entry] ?? '');
    let last: { rows: Record<string, unknown>[]; columns: string[] } = { rows: [], columns: [] };
    for (const s of statements) last = await db.query(s);
    return { columns: last.columns, rows: last.rows, error: null, statements: statements.length };
  } catch (e) {
    return { columns: [], rows: [], error: formatError(e), statements: 0 };
  } finally {
    await db.close();
  }
}

export async function runSqlChecks(opts: {
  files: Record<string, string>;
  entry?: string;
  checks: Check[];
  createDb?: () => Promise<SqlDb>;
  timeoutMs?: number;
}): Promise<SqlRunOutcome> {
  const entry = opts.entry ?? DEFAULT_SQL_ENTRY;
  const createDb = opts.createDb ?? createSqlDb;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const results: CheckResult[] = [];
  for (const check of opts.checks) {
    const started = performance.now();
    const db = await createDb();
    try {
      await applyFiles(db, opts.files, entry);
      const ctx: CheckContext = {
        get mod(): Record<string, unknown> { throw new Error('ctx.mod is not available in SQL exercises'); },
        get Component(): never { throw new Error('ctx.Component is not available in SQL exercises'); },
        get render(): never { throw new Error("ctx.render is not available in SQL exercises (runtime: 'sql')"); },
        get screen(): never { throw new Error("ctx.screen is not available in SQL exercises (runtime: 'sql')"); },
        get within(): never { throw new Error("ctx.within is not available in SQL exercises (runtime: 'sql')"); },
        get user(): never { throw new Error("ctx.user is not available in SQL exercises (runtime: 'sql')"); },
        get act(): never { throw new Error("ctx.act is not available in SQL exercises (runtime: 'sql')"); },
        expect,
        server: controls,
        sleep,
        db,
      };
      await withTimeout(Promise.resolve(check.run(ctx)), timeoutMs);
      results.push({ name: check.name, status: 'pass', durationMs: performance.now() - started });
    } catch (e) {
      results.push({ name: check.name, status: 'fail', error: formatError(e), durationMs: performance.now() - started });
    } finally {
      await db.close();
    }
  }
  return { kind: 'results', results, allPassed: results.every((r) => r.status === 'pass') };
}
