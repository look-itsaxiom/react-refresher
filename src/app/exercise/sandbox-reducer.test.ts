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
});
