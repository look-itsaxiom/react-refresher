import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'cached() memoizes per tag: a second read does not call the loader again',
    run: async ({ mod, expect }) => {
      const { cache } = mod as { cache: { cached: <T>(tag: string, loader: () => Promise<T>) => Promise<T> } };
      let calls = 0;
      const loader = async () => {
        calls += 1;
        return ['a'];
      };
      const first = await cache.cached('todos', loader);
      const second = await cache.cached('todos', loader);
      expect(calls, 'loader should run once; the second read should be served from cache').to.equal(1);
      expect(second).to.deep.equal(first);
    },
  },
  {
    name: 'different tags are cached independently',
    run: async ({ mod, expect }) => {
      const { cache } = mod as { cache: { cached: <T>(tag: string, loader: () => Promise<T>) => Promise<T> } };
      let calls = 0;
      const loader = async () => {
        calls += 1;
        return calls;
      };
      await cache.cached('todos', loader);
      await cache.cached('users', loader);
      expect(calls, 'each distinct tag should load once').to.equal(2);
    },
  },
  {
    name: 'revalidateTag clears only that tag, so the next cached() read is fresh',
    run: async ({ mod, expect }) => {
      const { cache } = mod as {
        cache: {
          cached: <T>(tag: string, loader: () => Promise<T>) => Promise<T>;
          revalidateTag: (tag: string) => void;
        };
      };
      let calls = 0;
      const loader = async () => {
        calls += 1;
        return calls;
      };
      await cache.cached('todos', loader);
      const stillCached = await cache.cached('todos', loader);
      expect(stillCached, 'before revalidating, a second read should still be the cached value').to.equal(1);
      cache.revalidateTag('todos');
      const fresh = await cache.cached('todos', loader);
      expect(fresh, 'after revalidateTag, cached() should re-run the loader').to.equal(2);
    },
  },
  {
    name: 'a mutation followed by revalidateTag makes the next read reflect the new server data',
    run: async ({ mod, expect, server }) => {
      server.setLatency(10);
      const { addTodoAction } = mod as {
        addTodoAction: (prev: Array<{ title: string }>, fd: FormData) => Promise<Array<{ title: string }>>;
      };
      const before = await addTodoAction([], new FormData());
      const form = new FormData();
      form.set('title', 'Buy milk');
      const after = await addTodoAction(before, form);
      expect(
        after.some((t) => t.title === 'Buy milk'),
        'the revalidated read should include the just-added todo',
      ).to.equal(true);
    },
  },
];
