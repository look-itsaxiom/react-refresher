import type { Check } from '../../../types';

type Loader<T> = () => Promise<T>;
type RequestContext = { memo: <T>(key: string, loader: Loader<T>) => Promise<T> };
type CacheControlOptions = { public?: boolean; maxAge: number; swr?: number; vary?: string[] };
type FakeResponse = { headers: Record<string, string> };

type Mod = {
  createRequestCache: () => { run: <T>(fn: (ctx: RequestContext) => Promise<T>) => Promise<T> };
  withCacheControl: <R extends FakeResponse>(response: R, options: CacheControlOptions) => R;
};

export const checks: Check[] = [
  {
    name: 'memo dedupes two concurrent calls with the same key to a single loader call',
    run: async ({ mod, expect }) => {
      const { createRequestCache } = mod as unknown as Mod;
      let calls = 0;
      const cache = createRequestCache();
      const [a, b] = await cache.run(async ({ memo }) => {
        const p1 = memo('user:1', async () => {
          calls++;
          return { id: '1' };
        });
        const p2 = memo('user:1', async () => {
          calls++;
          return { id: '1' };
        });
        return Promise.all([p1, p2]);
      });
      expect(calls, 'the loader should run exactly once for a repeated key').to.equal(1);
      expect(a).to.deep.equal({ id: '1' });
      expect(b).to.deep.equal({ id: '1' });
    },
  },
  {
    name: 'different keys within the same run are not falsely deduped',
    run: async ({ mod, expect }) => {
      const { createRequestCache } = mod as unknown as Mod;
      let calls = 0;
      const cache = createRequestCache();
      const results = await cache.run(async ({ memo }) => {
        const a = memo('user:1', async () => {
          calls++;
          return 'one';
        });
        const b = memo('user:2', async () => {
          calls++;
          return 'two';
        });
        return Promise.all([a, b]);
      });
      expect(calls, 'two distinct keys should each trigger their own loader call').to.equal(2);
      expect(results).to.deep.equal(['one', 'two']);
    },
  },
  {
    name: 'two concurrent requests never share cache entries, even with the same key',
    run: async ({ mod, expect }) => {
      const { createRequestCache } = mod as unknown as Mod;
      const cache = createRequestCache();
      let callsForA = 0;
      let callsForB = 0;

      const runFor = (userId: string, onCall: () => void) =>
        cache.run(async ({ memo }) => {
          // Both requests use the SAME key -- correct isolation must still
          // keep them from seeing each other's result.
          return memo('current-user', async () => {
            onCall();
            await new Promise((resolve) => setTimeout(resolve, 5));
            return { userId };
          });
        });

      const [resultA, resultB] = await Promise.all([
        runFor('alice', () => callsForA++),
        runFor('bob', () => callsForB++),
      ]);

      expect(resultA).to.deep.equal({ userId: 'alice' });
      expect(resultB).to.deep.equal({ userId: 'bob' });
      expect(callsForA, "alice's request should load its own data").to.equal(1);
      expect(callsForB, "bob's request should load its own data").to.equal(1);
    },
  },
  {
    name: 'withCacheControl builds a public, max-age, stale-while-revalidate, and Vary header',
    run: async ({ mod, expect }) => {
      const { withCacheControl } = mod as unknown as Mod;
      const response = withCacheControl({ headers: {} as Record<string, string> }, { public: true, maxAge: 60, swr: 30, vary: ['Cookie', 'Accept-Language'] });
      expect(response.headers['Cache-Control']).to.equal('public, max-age=60, stale-while-revalidate=30');
      expect(response.headers['Vary']).to.equal('Cookie, Accept-Language');
    },
  },
  {
    name: 'withCacheControl defaults to private, omits stale-while-revalidate and Vary when not given',
    run: async ({ mod, expect }) => {
      const { withCacheControl } = mod as unknown as Mod;
      const response = withCacheControl({ headers: {} as Record<string, string> }, { maxAge: 10 });
      expect(response.headers['Cache-Control']).to.equal('private, max-age=10');
      expect(response.headers['Vary']).to.equal(undefined);
    },
  },
];
