import { describe, it, expect, vi, afterEach } from 'vitest';
import { createPreviewHost } from './preview-host';
import { baseRegistry } from './registry';
import type { FrameToParent, ParentToFrame } from './protocol';
import type { Check, SqlDb } from '../content/types';

function setup(checks: Check[] | undefined) {
  const posted: FrameToParent[] = [];
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const host = createPreviewHost({
    post: (m) => posted.push(m),
    registry: baseRegistry,
    findChecks: () => checks,
    mount,
  });
  return { host, posted, mount };
}

const run = (over: Partial<ParentToFrame>): ParentToFrame => ({
  type: 'run', runId: 1, exerciseKey: 'l/e', entry: 'App.tsx', mode: 'preview',
  files: { 'App.tsx': 'export default function App() { return <h1>Hi there</h1>; }' },
  ...over,
});

describe('preview host', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders the default export into the mount and posts preview-ok', async () => {
    const { host, posted, mount } = setup([]);
    await host.handle(run({}));
    expect(mount.textContent).toContain('Hi there');
    expect(posted).toContainEqual({ type: 'preview-ok', runId: 1 });
  });

  it('replaces the previous render on the next run', async () => {
    const { host, mount } = setup([]);
    await host.handle(run({}));
    await host.handle(run({ runId: 2, files: { 'App.tsx': 'export default () => <p>Second</p>;' } }));
    expect(mount.textContent).toBe('Second');
  });

  it('posts compile-error with location for broken code', async () => {
    const { host, posted } = setup([]);
    await host.handle(run({ files: { 'App.tsx': 'export default function App() { return <p>; }' } }));
    const err = posted.find((m) => m.type === 'compile-error');
    expect(err).toBeDefined();
    if (err?.type === 'compile-error') expect(err.filename).toBe('App.tsx');
  });

  it('posts runtime-error when rendering throws, and shows an error card', async () => {
    const { host, posted, mount } = setup([]);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await host.handle(run({ files: { 'App.tsx': 'export default function App() { throw new Error("nope"); }' } }));
    spy.mockRestore();
    expect(posted.some((m) => m.type === 'runtime-error' && m.message.includes('nope'))).toBe(true);
    expect(mount.textContent).toContain('nope');
  });

  it('runs checks, posts results, and re-renders the preview afterwards', async () => {
    const checks: Check[] = [
      { name: 'has heading', run: ({ render, screen, expect, Component }) => { render(<Component />); expect(screen.getByRole('heading').textContent).to.equal('Hi there'); } },
    ];
    const { host, posted, mount } = setup(checks);
    await host.handle(run({ mode: 'checks', runId: 7 }));
    const results = posted.find((m) => m.type === 'check-results');
    expect(results).toMatchObject({ type: 'check-results', runId: 7, allPassed: true });
    expect(mount.textContent).toContain('Hi there');
  });

  it('reports an unknown exercise as a failed check result', async () => {
    const { host, posted } = setup(undefined);
    await host.handle(run({ mode: 'checks' }));
    const results = posted.find((m) => m.type === 'check-results');
    expect(results).toMatchObject({ allPassed: false });
  });

  it('runs SQL previews and checks through the sql runner when runtime is sql', async () => {
    const posted: FrameToParent[] = [];
    const fakeDb = () => Promise.resolve<SqlDb>({
      async query<T = Record<string, unknown>>(sql: string) { return sql.includes('boom') ? Promise.reject(new Error('relation "boom" does not exist')) : { rows: [{ one: 1 }] as T[], columns: ['one'] }; },
      async exec(sql: string) { if (sql.includes('boom')) throw new Error('relation "boom" does not exist'); },
      async explain() { return ['Seq Scan on t']; },
      async close() {},
    });
    const host = createPreviewHost({
      post: (m) => posted.push(m),
      registry: baseRegistry,
      findChecks: () => [{ name: 'has a row', run: async ({ db, expect }) => { const r = await db.query('select 1 as one'); expect(r.rows.length).to.equal(1); } }],
      mount: document.createElement('div'),
      createSqlDb: fakeDb,
    });
    await host.handle({ type: 'run', runId: 1, mode: 'preview', runtime: 'sql', files: { 'query.sql': 'select 1 as one' }, entry: 'query.sql', exerciseKey: 'x/y' });
    expect(posted.at(-1)).toMatchObject({ type: 'sql-result', runId: 1, columns: ['one'], error: null });
    await host.handle({ type: 'run', runId: 2, mode: 'checks', runtime: 'sql', files: { 'query.sql': 'select 1 as one' }, entry: 'query.sql', exerciseKey: 'x/y' });
    expect(posted.at(-1)).toMatchObject({ type: 'check-results', runId: 2, allPassed: true });
    await host.handle({ type: 'run', runId: 3, mode: 'preview', runtime: 'sql', files: { 'query.sql': 'select * from boom' }, entry: 'query.sql', exerciseKey: 'x/y' });
    expect(posted.at(-1)).toMatchObject({ type: 'sql-result', runId: 3, error: expect.stringMatching(/boom/) });
  });

  it('does not leave a stale sql-result error once checks post their own results for a failing script', async () => {
    const posted: FrameToParent[] = [];
    const fakeDb = () => Promise.resolve<SqlDb>({
      async query<T = Record<string, unknown>>(sql: string) { return sql.includes('boom') ? Promise.reject(new Error('relation "boom" does not exist')) : { rows: [{ one: 1 }] as T[], columns: ['one'] }; },
      async exec(sql: string) { if (sql.includes('boom')) throw new Error('relation "boom" does not exist'); },
      async explain() { return ['Seq Scan on t']; },
      async close() {},
    });
    const host = createPreviewHost({
      post: (m) => posted.push(m),
      registry: baseRegistry,
      findChecks: () => [{ name: 'has a row', run: async ({ db, expect }) => { const r = await db.query('select 1 as one'); expect(r.rows.length).to.equal(1); } }],
      mount: document.createElement('div'),
      createSqlDb: fakeDb,
    });
    await host.handle({ type: 'run', runId: 4, mode: 'checks', runtime: 'sql', files: { 'query.sql': 'select * from boom' }, entry: 'query.sql', exerciseKey: 'x/y' });
    const sqlResult = posted.find((m) => m.type === 'sql-result');
    expect(sqlResult).toMatchObject({ type: 'sql-result', runId: 4, error: expect.stringMatching(/boom/) });
    expect(posted.at(-1)).toMatchObject({ type: 'check-results', runId: 4, allPassed: false });
    if (posted.at(-1)?.type === 'check-results') {
      expect(posted.at(-1)).toMatchObject({ results: [{ name: 'has a row', status: 'fail' }] });
    }
  });
});
