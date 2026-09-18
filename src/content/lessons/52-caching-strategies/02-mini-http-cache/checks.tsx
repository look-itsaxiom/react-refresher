import type { Check } from '../../../types';

type HttpHeaders = Record<string, string>;
type FakeRequest = { url: string; headers?: HttpHeaders };
type FakeResponse = { status: number; headers: HttpHeaders; body: string };
type Origin = (request: FakeRequest) => FakeResponse;
type CacheStatus = 'HIT' | 'MISS' | 'STALE' | 'REVALIDATED';
type FetchResult = { response: FakeResponse; cacheStatus: CacheStatus };
type Clock = () => number;

type Mod = {
  createHttpCache: (clock: Clock) => { fetch: (request: FakeRequest, origin: Origin) => FetchResult };
};

function makeClock() {
  let now = 0;
  return { clock: () => now, advanceTo: (t: number) => (now = t) };
}

export const checks: Check[] = [
  {
    name: 'a fresh response is served without contacting the origin (HIT)',
    run: async ({ mod, expect }) => {
      const { createHttpCache } = mod as unknown as Mod;
      const { clock, advanceTo } = makeClock();
      const cache = createHttpCache(clock);
      let originCalls = 0;
      const origin: Origin = () => {
        originCalls++;
        return { status: 200, headers: { 'Cache-Control': 'public, max-age=60' }, body: 'v1' };
      };

      const first = cache.fetch({ url: '/a' }, origin);
      expect(first.cacheStatus).to.equal('MISS');
      advanceTo(30_000);
      const second = cache.fetch({ url: '/a' }, origin);
      expect(second.cacheStatus, 'still within max-age=60s at t=30s').to.equal('HIT');
      expect(originCalls, 'the origin should be contacted exactly once').to.equal(1);
    },
  },
  {
    name: 'a shared cache uses s-maxage instead of max-age when both are present',
    run: async ({ mod, expect }) => {
      const { createHttpCache } = mod as unknown as Mod;
      const { clock, advanceTo } = makeClock();
      const cache = createHttpCache(clock);
      const origin: Origin = () => ({
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=1, s-maxage=100' },
        body: 'v1',
      });

      cache.fetch({ url: '/a' }, origin);
      advanceTo(5_000); // past max-age=1s, well within s-maxage=100s
      const result = cache.fetch({ url: '/a' }, origin);
      expect(result.cacheStatus, 'a shared cache should honor s-maxage, not max-age').to.equal('HIT');
    },
  },
  {
    name: 'no-store responses are never cached',
    run: async ({ mod, expect }) => {
      const { createHttpCache } = mod as unknown as Mod;
      const { clock } = makeClock();
      const cache = createHttpCache(clock);
      let originCalls = 0;
      const origin: Origin = () => {
        originCalls++;
        return { status: 200, headers: { 'Cache-Control': 'no-store' }, body: 'v1' };
      };

      const first = cache.fetch({ url: '/a' }, origin);
      const second = cache.fetch({ url: '/a' }, origin);
      expect(first.cacheStatus).to.equal('MISS');
      expect(second.cacheStatus, 'no-store must never be served from cache').to.equal('MISS');
      expect(originCalls, 'every request should reach the origin').to.equal(2);
    },
  },
  {
    name: 'stale-while-revalidate serves the stale body immediately and refreshes the entry',
    run: async ({ mod, expect }) => {
      const { createHttpCache } = mod as unknown as Mod;
      const { clock, advanceTo } = makeClock();
      const cache = createHttpCache(clock);
      let originCalls = 0;
      const origin: Origin = (request) => {
        originCalls++;
        if (request.headers?.['If-None-Match'] === '"v1"') {
          return { status: 304, headers: {} as HttpHeaders, body: '' };
        }
        return {
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=10, stale-while-revalidate=20',
            ETag: '"v1"',
          },
          body: 'v1-body',
        };
      };

      const first = cache.fetch({ url: '/a' }, origin);
      expect(first.response.body).to.equal('v1-body');

      advanceTo(15_000); // stale (>10s) but inside the swr window (10s + 20s)
      const second = cache.fetch({ url: '/a' }, origin);
      expect(second.cacheStatus, 'should serve the stale response, not block on the origin').to.equal('STALE');
      expect(second.response.body, 'the caller still gets the old body immediately').to.equal('v1-body');
      expect(originCalls, 'a revalidation call should have been made').to.equal(2);

      const third = cache.fetch({ url: '/a' }, origin);
      expect(third.cacheStatus, 'the revalidation should have refreshed freshness for the next call').to.equal('HIT');
      expect(originCalls, 'the third call should not need to contact the origin again').to.equal(2);
    },
  },
  {
    name: 'stale-if-error serves the stale body when the origin fails',
    run: async ({ mod, expect }) => {
      const { createHttpCache } = mod as unknown as Mod;
      const { clock, advanceTo } = makeClock();
      const cache = createHttpCache(clock);
      const origin: Origin = (request) => {
        if (request.headers?.['If-None-Match'] === '"v1"') {
          return { status: 503, headers: {} as HttpHeaders, body: 'origin down' };
        }
        return {
          status: 200,
          headers: { 'Cache-Control': 'public, max-age=1, stale-if-error=50', ETag: '"v1"' },
          body: 'ok-body',
        };
      };

      cache.fetch({ url: '/a' }, origin);
      advanceTo(5_000); // past max-age=1s, well within stale-if-error=50s
      const result = cache.fetch({ url: '/a' }, origin);
      expect(result.cacheStatus, 'a 5xx during revalidation should fall back to the stale copy').to.equal('STALE');
      expect(result.response.body).to.equal('ok-body');
    },
  },
  {
    name: 'Vary keys the cache by the listed request header',
    run: async ({ mod, expect }) => {
      const { createHttpCache } = mod as unknown as Mod;
      const { clock } = makeClock();
      const cache = createHttpCache(clock);
      const origin: Origin = (request) => ({
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=60', Vary: 'Accept-Encoding' },
        body: request.headers?.['Accept-Encoding'] === 'br' ? 'br-body' : 'gzip-body',
      });

      const gzip = cache.fetch({ url: '/a', headers: { 'Accept-Encoding': 'gzip' } }, origin);
      expect(gzip.response.body).to.equal('gzip-body');

      const br = cache.fetch({ url: '/a', headers: { 'Accept-Encoding': 'br' } }, origin);
      expect(br.cacheStatus, 'a different Accept-Encoding is a different cache entry').to.equal('MISS');
      expect(br.response.body, 'the br variant must not reuse the gzip body').to.equal('br-body');

      const gzipAgain = cache.fetch({ url: '/a', headers: { 'Accept-Encoding': 'gzip' } }, origin);
      expect(gzipAgain.cacheStatus, 'the gzip variant should still be cached').to.equal('HIT');
      expect(gzipAgain.response.body).to.equal('gzip-body');
    },
  },
  {
    name: 'a 304 outside the swr window blocks once, then resets freshness',
    run: async ({ mod, expect }) => {
      const { createHttpCache } = mod as unknown as Mod;
      const { clock, advanceTo } = makeClock();
      const cache = createHttpCache(clock);
      const origin: Origin = (request) => {
        if (request.headers?.['If-None-Match'] === '"v1"') {
          return { status: 304, headers: {} as HttpHeaders, body: '' };
        }
        return {
          status: 200,
          headers: { 'Cache-Control': 'public, max-age=1', ETag: '"v1"' },
          body: 'stable-body',
        };
      };

      cache.fetch({ url: '/a' }, origin);
      advanceTo(5_000); // past max-age=1s, no swr window at all
      const revalidated = cache.fetch({ url: '/a' }, origin);
      expect(revalidated.cacheStatus, 'a blocking 304 confirms the same content').to.equal('REVALIDATED');
      expect(revalidated.response.body).to.equal('stable-body');

      const afterward = cache.fetch({ url: '/a' }, origin);
      expect(afterward.cacheStatus, 'the revalidation should have reset freshness').to.equal('HIT');
    },
  },
];
