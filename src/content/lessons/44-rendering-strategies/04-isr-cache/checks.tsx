import type { Check } from '../../../types';

type Render = (key: string) => Promise<string>;
type Clock = () => number;
type IsrCache = {
  get(key: string, render: Render): Promise<string>;
  invalidate(key: string): void;
};
type Mod = {
  createIsrCache: (options: { revalidateSeconds: number; clock: Clock }) => IsrCache;
};

function makeClock(startMs: number) {
  let now = startMs;
  return { clock: (): number => now, advance: (ms: number) => (now += ms) };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

export const checks: Check[] = [
  {
    name: 'a cold miss calls render exactly once and returns its result',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { createIsrCache } = mod as unknown as Mod;
      const { clock } = makeClock(0);
      const cache = createIsrCache({ revalidateSeconds: 60, clock });

      let calls = 0;
      const render: Render = async (key) => {
        calls += 1;
        return `html:${key}:1`;
      };

      const result = await cache.get('/home', render);
      expect(result).to.equal('html:/home:1');
      expect(calls).to.equal(1);
    },
  },
  {
    name: 'a fresh hit returns the cached value without calling render again',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { createIsrCache } = mod as unknown as Mod;
      const { clock, advance } = makeClock(0);
      const cache = createIsrCache({ revalidateSeconds: 60, clock });

      let calls = 0;
      const render: Render = async (key) => {
        calls += 1;
        return `html:${key}:${calls}`;
      };

      await cache.get('/home', render);
      advance(30_000); // well under the 60s window
      const second = await cache.get('/home', render);

      expect(second).to.equal('html:/home:1');
      expect(calls).to.equal(1);
    },
  },
  {
    name: 'a stale hit returns the old cached value immediately, before the background render finishes',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { createIsrCache } = mod as unknown as Mod;
      const { clock, advance } = makeClock(0);
      const cache = createIsrCache({ revalidateSeconds: 60, clock });

      const firstRender: Render = async () => 'html:v1';
      await cache.get('/home', firstRender);
      advance(90_000); // past the 60s window

      const slow = deferred<string>();
      let renderStarted = false;
      let renderFinished = false;
      const slowRender: Render = async () => {
        renderStarted = true;
        const html = await slow.promise;
        renderFinished = true;
        return html;
      };

      const result = await cache.get('/home', slowRender);

      expect(result, 'expected the stale value while revalidation is still pending').to.equal('html:v1');
      expect(renderStarted, 'expected the background revalidation to have started').to.equal(true);
      expect(renderFinished, 'get() should not wait for the background render to finish').to.equal(false);

      slow.resolve('html:v2');
      await slow.promise;
      await Promise.resolve(); // let the cache's own .then() run
      await Promise.resolve();
    },
  },
  {
    name: 'concurrent stale hits for the same key dedupe: only one render call is in flight',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { createIsrCache } = mod as unknown as Mod;
      const { clock, advance } = makeClock(0);
      const cache = createIsrCache({ revalidateSeconds: 60, clock });

      await cache.get('/home', async () => 'html:v1');
      advance(90_000);

      const slow = deferred<string>();
      let renderCalls = 0;
      const slowRender: Render = async () => {
        renderCalls += 1;
        return slow.promise;
      };

      const [first, second] = await Promise.all([
        cache.get('/home', slowRender),
        cache.get('/home', slowRender),
      ]);

      expect(first).to.equal('html:v1');
      expect(second).to.equal('html:v1');
      expect(renderCalls, 'a second concurrent stale hit should not start another render').to.equal(1);

      slow.resolve('html:v2');
      await slow.promise;
      await Promise.resolve();
      await Promise.resolve();

      // Once the background render has landed and we're within a fresh window again,
      // the cache should serve the new value without calling render a third time.
      const third = await cache.get('/home', slowRender);
      expect(third).to.equal('html:v2');
      expect(renderCalls).to.equal(1);
    },
  },
  {
    name: 'invalidate clears the entry so the next get() blocks on a fresh render instead of serving stale data',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { createIsrCache } = mod as unknown as Mod;
      const { clock } = makeClock(0);
      const cache = createIsrCache({ revalidateSeconds: 60, clock });

      await cache.get('/home', async () => 'html:v1');
      cache.invalidate('/home');

      let calls = 0;
      const result = await cache.get('/home', async () => {
        calls += 1;
        return 'html:v2';
      });

      expect(result, 'expected a fresh render, not the invalidated stale value').to.equal('html:v2');
      expect(calls).to.equal(1);
    },
  },
];
