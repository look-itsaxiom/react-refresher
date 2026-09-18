import { describe, it, expect } from 'vitest';
import { sandboxReducer, initialSandboxState } from './sandbox-reducer';

describe('sandboxReducer', () => {
  it('tracks readiness and run phases', () => {
    let s = sandboxReducer(initialSandboxState, { type: 'message', msg: { type: 'ready' } });
    expect(s.ready).toBe(true);
    s = sandboxReducer(s, { type: 'start', runId: 1, mode: 'preview' });
    expect(s.phase).toBe('compiling');
    s = sandboxReducer(s, { type: 'message', msg: { type: 'preview-ok', runId: 1 } });
    expect(s.phase).toBe('ok');
    expect(s.error).toBeNull();
  });

  it('ignores messages from stale runs', () => {
    let s = sandboxReducer(initialSandboxState, { type: 'start', runId: 2, mode: 'checks' });
    s = sandboxReducer(s, { type: 'message', msg: { type: 'check-results', runId: 1, results: [], allPassed: true } });
    expect(s.results).toBeNull();
    expect(s.phase).toBe('checking');
  });

  it('records compile errors, runtime errors, and results', () => {
    let s = sandboxReducer(initialSandboxState, { type: 'start', runId: 3, mode: 'checks' });
    s = sandboxReducer(s, { type: 'message', msg: { type: 'compile-error', runId: 3, message: 'bad', filename: 'App.tsx', line: 2 } });
    expect(s.phase).toBe('compile-error');
    expect(s.error).toEqual({ message: 'bad', filename: 'App.tsx', line: 2 });
    s = sandboxReducer(s, { type: 'start', runId: 4, mode: 'checks' });
    expect(s.error).toBeNull();
    s = sandboxReducer(s, { type: 'message', msg: { type: 'check-results', runId: 4, allPassed: false, results: [{ name: 'x', status: 'fail', error: 'e', durationMs: 1 }] } });
    expect(s.phase).toBe('ok');
    expect(s.allPassed).toBe(false);
    expect(s.results?.length).toBe(1);
    s = sandboxReducer(s, { type: 'message', msg: { type: 'runtime-error', runId: 4, message: 'kaboom' } });
    expect(s.phase).toBe('runtime-error');
  });

  it('collects console lines with ids and clears them on demand and on new runs', () => {
    let s = sandboxReducer(initialSandboxState, { type: 'message', msg: { type: 'console', level: 'log', args: ['a', 'b'] } });
    s = sandboxReducer(s, { type: 'message', msg: { type: 'console', level: 'warn', args: ['c'] } });
    expect(s.logs.map((l) => l.text)).toEqual(['a b', 'c']);
    expect(s.logs[0]?.id).not.toBe(s.logs[1]?.id);
    s = sandboxReducer(s, { type: 'start', runId: 9, mode: 'preview' });
    expect(s.logs).toEqual([]);
    s = sandboxReducer(s, { type: 'message', msg: { type: 'console', level: 'log', args: ['d'] } });
    s = sandboxReducer(s, { type: 'clear-logs' });
    expect(s.logs).toEqual([]);
  });

  it('stores sql-result for the current run and ignores stale ones', () => {
    let s = sandboxReducer(initialSandboxState, { type: 'start', runId: 3, mode: 'preview' });
    s = sandboxReducer(s, { type: 'message', msg: { type: 'sql-result', runId: 2, columns: ['x'], rows: [{ x: 1 }], error: null, statements: 1 } });
    expect(s.sql).toBeNull();
    s = sandboxReducer(s, { type: 'message', msg: { type: 'sql-result', runId: 3, columns: ['x'], rows: [{ x: 1 }], error: null, statements: 1 } });
    expect(s.sql?.rows).toEqual([{ x: 1 }]);
    expect(s.phase).toBe('ok');
    s = sandboxReducer(s, { type: 'message', msg: { type: 'sql-result', runId: 3, columns: [], rows: [], error: 'syntax error', statements: 0 } });
    expect(s.phase).toBe('runtime-error');
    expect(s.error?.message).toBe('syntax error');
  });

  it('clears a stale error once check-results follows a failing sql-result', () => {
    let s = sandboxReducer(initialSandboxState, { type: 'start', runId: 5, mode: 'checks' });
    s = sandboxReducer(s, { type: 'message', msg: { type: 'sql-result', runId: 5, columns: [], rows: [], error: 'syntax error', statements: 0 } });
    expect(s.phase).toBe('runtime-error');
    expect(s.error?.message).toBe('syntax error');
    s = sandboxReducer(s, { type: 'message', msg: { type: 'check-results', runId: 5, results: [{ name: 'has a row', status: 'fail', error: 'syntax error', durationMs: 1 }], allPassed: false } });
    expect(s.phase).toBe('ok');
    expect(s.error).toBeNull();
    expect(s.results).toEqual([{ name: 'has a row', status: 'fail', error: 'syntax error', durationMs: 1 }]);
    expect(s.sql?.error).toBe('syntax error');
  });
});
