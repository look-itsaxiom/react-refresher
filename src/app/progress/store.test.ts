import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProgressStore } from './store';
import { emptyProgress, type Progress } from './types';

function fakeBackend(initial: Progress = emptyProgress()) {
  const saves: Progress[] = [];
  let failNext = false;
  return {
    saves,
    failNext: () => { failNext = true; },
    backend: {
      load: vi.fn(async () => structuredClone(initial)),
      save: vi.fn(async (p: Progress) => {
        if (failNext) { failNext = false; throw new Error('disk full'); }
        saves.push(structuredClone(p));
      }),
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('progress store', () => {
  it('loads from the backend and exposes a snapshot', async () => {
    const seed = { ...emptyProgress(), steps: { 'a/b': { completedAt: 't' } } };
    const { backend } = fakeBackend(seed);
    const store = createProgressStore(backend);
    expect(store.getSaveState()).toBe('loading');
    await store.load();
    expect(store.getSnapshot().steps['a/b']).toEqual({ completedAt: 't' });
    expect(store.getSaveState()).toBe('idle');
  });

  it('updates optimistically, notifies subscribers, and debounces saves into one write', async () => {
    const { backend, saves } = fakeBackend();
    const store = createProgressStore(backend, { debounceMs: 100, now: () => '2026-09-17T00:00:00.000Z' });
    await store.load();
    const listener = vi.fn();
    store.subscribe(listener);

    store.completeStep('l/s1');
    store.saveCode('l/ex', { 'App.tsx': 'v1' });
    store.saveCode('l/ex', { 'App.tsx': 'v2' });
    store.answerQuiz('l/q', 'q1', 'b');
    store.setLastVisited('/lesson/l/2');

    expect(listener).toHaveBeenCalled();
    expect(store.getSnapshot().steps['l/s1']?.completedAt).toBe('2026-09-17T00:00:00.000Z');
    expect(store.getSnapshot().code['l/ex']).toEqual({ 'App.tsx': 'v2' });
    expect(store.getSnapshot().quiz['l/q']).toEqual({ q1: 'b' });
    expect(store.getSnapshot().lastVisited).toBe('/lesson/l/2');
    expect(saves.length).toBe(0);
    expect(store.getSaveState()).toBe('saving');

    await vi.advanceTimersByTimeAsync(100);
    expect(saves.length).toBe(1);
    expect(saves[0]?.code['l/ex']).toEqual({ 'App.tsx': 'v2' });
    expect(store.getSaveState()).toBe('saved');
  });

  it('snapshot identity is stable when nothing changed (useSyncExternalStore friendly)', async () => {
    const { backend } = fakeBackend();
    const store = createProgressStore(backend);
    await store.load();
    const a = store.getSnapshot();
    store.completeStep('x/y');
    store.completeStep('x/y'); // already complete: must not create a new snapshot
    const b = store.getSnapshot();
    expect(a).not.toBe(b);
    store.completeStep('x/y');
    expect(store.getSnapshot()).toBe(b);
  });

  it('marks error on save failure, keeps local state, and retrySave recovers', async () => {
    const { backend, saves, failNext } = fakeBackend();
    const store = createProgressStore(backend, { debounceMs: 10 });
    await store.load();
    failNext();
    store.completeStep('a/b');
    await vi.advanceTimersByTimeAsync(10);
    expect(store.getSaveState()).toBe('error');
    expect(store.getSnapshot().steps['a/b']).toBeDefined();
    store.retrySave();
    await vi.advanceTimersByTimeAsync(10);
    expect(saves.length).toBe(1);
    expect(store.getSaveState()).toBe('saved');
  });

  it('replace() swaps the whole progress (import) and uncompleteStep removes a step', async () => {
    const { backend } = fakeBackend();
    const store = createProgressStore(backend, { debounceMs: 10 });
    await store.load();
    store.replace({ ...emptyProgress(), steps: { 'p/q': { completedAt: 'z' } } });
    expect(store.getSnapshot().steps['p/q']).toBeDefined();
    store.uncompleteStep('p/q');
    expect(store.getSnapshot().steps['p/q']).toBeUndefined();
  });

  it('flush() saves immediately without waiting for the debounce', async () => {
    const { backend, saves } = fakeBackend();
    const store = createProgressStore(backend, { debounceMs: 1000 });
    await store.load();
    store.completeStep('a/b');
    await store.flush();
    expect(saves.length).toBe(1);
  });

  it('serializes saves: an edit + flush during an in-flight save does not start a concurrent save', async () => {
    const { backend, saves } = fakeBackend();
    let rejectFirst: (e: unknown) => void = () => {};
    let resolveSecond: () => void = () => {};
    let callCount = 0;
    backend.save.mockImplementation((p: Progress) => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise<void>((_resolve, reject) => { rejectFirst = reject; });
      }
      return new Promise<void>((resolve) => {
        resolveSecond = () => { saves.push(structuredClone(p)); resolve(); };
      });
    });
    const store = createProgressStore(backend, { debounceMs: 10 });
    await store.load();

    store.completeStep('a/b');
    await vi.advanceTimersByTimeAsync(10); // save #1 starts and is now in flight
    expect(backend.save).toHaveBeenCalledTimes(1);

    store.saveCode('a/b', { 'App.tsx': 'v2' }); // edit while save #1 is still pending
    const flushed = store.flush(); // must not start a second, overlapping save
    expect(backend.save).toHaveBeenCalledTimes(1);

    rejectFirst(new Error('disk full'));
    await flushed;
    expect(store.getSaveState()).toBe('error');
    expect(backend.save).toHaveBeenCalledTimes(1); // no concurrent save was ever started

    store.retrySave();
    expect(backend.save).toHaveBeenCalledTimes(2); // save #2 only starts once #1 has settled

    resolveSecond();
    await vi.advanceTimersByTimeAsync(0);
    expect(store.getSaveState()).toBe('saved');
    expect(saves.length).toBe(1);
    expect(saves[0]?.code['a/b']).toEqual({ 'App.tsx': 'v2' });
  });
});
