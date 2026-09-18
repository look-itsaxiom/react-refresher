import { describe, it, expect, beforeEach } from 'vitest';
import { serverCall, controls, onReset } from './core';
import { addTodo, getTodos, toggleTodo } from './todos';
import { fetchPosts } from './posts';

beforeEach(() => {
  controls.reset();
  controls.setLatency(0);
});

describe('serverCall', () => {
  it('resolves with the function result after the configured latency', async () => {
    controls.setLatency(20);
    const start = performance.now();
    await expect(serverCall(() => 'ok')).resolves.toBe('ok');
    expect(performance.now() - start).toBeGreaterThanOrEqual(15);
  });

  it('failNext rejects exactly one call, then recovers', async () => {
    controls.failNext('boom');
    await expect(serverCall(() => 1)).rejects.toThrow('boom');
    await expect(serverCall(() => 1)).resolves.toBe(1);
  });

  it('reset restores default latency and runs registered resetters', () => {
    let ran = 0;
    onReset(() => ran++);
    controls.setLatency(5);
    controls.reset();
    expect(ran).toBe(1);
  });
});

describe('todos', () => {
  it('starts empty, adds, toggles, and resets', async () => {
    expect(await getTodos()).toEqual([]);
    const afterAdd = await addTodo('Walk the dog');
    expect(afterAdd).toEqual([{ id: 1, title: 'Walk the dog', done: false }]);
    const afterToggle = await toggleTodo(1);
    expect(afterToggle[0]?.done).toBe(true);
    controls.reset();
    expect(await getTodos()).toEqual([]);
  });

  it('rejects blank titles', async () => {
    await expect(addTodo('   ')).rejects.toThrow(/required/i);
  });
});

describe('posts', () => {
  it('returns the same promise until reset so use() can read it across renders', async () => {
    const p1 = fetchPosts();
    expect(fetchPosts()).toBe(p1);
    expect((await p1).length).toBeGreaterThan(0);
    controls.reset();
    expect(fetchPosts()).not.toBe(p1);
  });
});

describe('reset makes in-flight calls stale', () => {
  it('a call started before reset still resolves but does not consume a later failNext', async () => {
    controls.reset();
    controls.setLatency(30);
    const stale = serverCall(() => 'stale');
    controls.reset(); // simulates the runner moving to the next check
    controls.setLatency(0);
    controls.failNext('for the next check');
    await expect(stale).resolves.toBe('stale');
    await expect(serverCall(() => 'fresh')).rejects.toThrow('for the next check');
  });
});
