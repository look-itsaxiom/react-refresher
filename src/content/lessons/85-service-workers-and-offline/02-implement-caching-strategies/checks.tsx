import type { Check } from '../../../types';

type StrategyCtx = {
  caches: { open(name: string): Promise<any> };
  fetch: (request: Request) => Promise<Response>;
  cacheName: string;
  waitUntil: (promise: Promise<unknown>) => void;
};
type Strategy = (request: Request, ctx: StrategyCtx) => Promise<Response>;

type Mod = {
  FakeCacheStorage: new () => { open(name: string): Promise<any> };
  cacheFirst: Strategy;
  networkFirst: (opts: { timeoutMs: number }) => Strategy;
  staleWhileRevalidate: Strategy;
};

/** A controllable fake network: counts calls, can go offline or slow down. */
function makeNetwork(bodies: Record<string, () => { status: number; body: string }>) {
  let calls = 0;
  let offline = false;
  let delayMs = 0;

  const fetch = async (request: Request): Promise<Response> => {
    calls++;
    if (offline) throw new TypeError('network offline');
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    const make = bodies[request.url];
    if (!make) throw new Error(`no fixture registered for ${request.url}`);
    const { status, body } = make();
    return new Response(body, { status });
  };

  return {
    fetch,
    get calls() {
      return calls;
    },
    setOffline: (value: boolean) => (offline = value),
    setDelay: (ms: number) => (delayMs = ms),
  };
}

function makeCtx(mod: Mod, fetch: (request: Request) => Promise<Response>) {
  const waited: Promise<unknown>[] = [];
  const ctx: StrategyCtx = {
    caches: new mod.FakeCacheStorage(),
    cacheName: 'test-v1',
    fetch,
    waitUntil: (p) => waited.push(p),
  };
  return { ctx, settle: () => Promise.all(waited) };
}

export const checks: Check[] = [
  {
    name: 'cacheFirst fetches the network once, then serves every later request from the cache',
    run: async ({ mod, expect }) => {
      const { cacheFirst } = mod as unknown as Mod;
      const network = makeNetwork({ 'https://x.test/a': () => ({ status: 200, body: 'v1' }) });
      const { ctx } = makeCtx(mod as unknown as Mod, network.fetch);
      const request = new Request('https://x.test/a');

      const first = await cacheFirst(request, ctx);
      expect(await first.text()).to.equal('v1');
      expect(network.calls, 'the first call is a miss, so it must hit the network').to.equal(1);

      const second = await cacheFirst(new Request('https://x.test/a'), ctx);
      expect(await second.text()).to.equal('v1');
      const third = await cacheFirst(new Request('https://x.test/a'), ctx);
      expect(await third.text()).to.equal('v1');
      expect(network.calls, 'later requests for the same URL must never touch the network again').to.equal(1);
    },
  },
  {
    name: 'cacheFirst never caches a non-OK response, so it keeps retrying the network',
    run: async ({ mod, expect }) => {
      const { cacheFirst } = mod as unknown as Mod;
      const network = makeNetwork({ 'https://x.test/missing': () => ({ status: 404, body: 'not found' }) });
      const { ctx } = makeCtx(mod as unknown as Mod, network.fetch);

      await cacheFirst(new Request('https://x.test/missing'), ctx);
      await cacheFirst(new Request('https://x.test/missing'), ctx);
      expect(network.calls, 'a 404 must not be cached, so every call is a network round trip').to.equal(2);
    },
  },
  {
    name: 'networkFirst returns the fresh network response and caches it while online',
    run: async ({ mod, expect }) => {
      const { networkFirst } = mod as unknown as Mod;
      let version = 0;
      const network = makeNetwork({
        'https://x.test/doc': () => ({ status: 200, body: `v${++version}` }),
      });
      const { ctx } = makeCtx(mod as unknown as Mod, network.fetch);
      const strategy = networkFirst({ timeoutMs: 200 });

      const response = await strategy(new Request('https://x.test/doc'), ctx);
      expect(await response.text()).to.equal('v1');
      expect(network.calls).to.equal(1);
    },
  },
  {
    name: 'networkFirst falls back to the cache when the network is offline',
    run: async ({ mod, expect }) => {
      const { networkFirst, cacheFirst } = mod as unknown as Mod;
      const network = makeNetwork({ 'https://x.test/doc': () => ({ status: 200, body: 'cached-version' }) });
      const { ctx } = makeCtx(mod as unknown as Mod, network.fetch);

      // Prime the cache first, while online, using cacheFirst against the same ctx/cacheName.
      await cacheFirst(new Request('https://x.test/doc'), ctx);

      network.setOffline(true);
      const strategy = networkFirst({ timeoutMs: 200 });
      const response = await strategy(new Request('https://x.test/doc'), ctx);
      expect(await response.text(), 'offline should fall back to the cached body').to.equal('cached-version');
    },
  },
  {
    name: 'networkFirst falls back to the cache when the network is slower than the timeout',
    run: async ({ mod, expect }) => {
      const { networkFirst, cacheFirst } = mod as unknown as Mod;
      const network = makeNetwork({ 'https://x.test/doc': () => ({ status: 200, body: 'cached-version' }) });
      const { ctx } = makeCtx(mod as unknown as Mod, network.fetch);

      await cacheFirst(new Request('https://x.test/doc'), ctx);

      network.setDelay(40);
      const strategy = networkFirst({ timeoutMs: 10 });
      const response = await strategy(new Request('https://x.test/doc'), ctx);
      expect(response, 'a slow network should not block past the timeout').to.exist;
      expect(await response.text(), 'the timeout should fall back to the cached body').to.equal('cached-version');
    },
  },
  {
    name: 'staleWhileRevalidate returns the stale body immediately and refreshes the cache in the background',
    run: async ({ mod, expect }) => {
      const { staleWhileRevalidate, cacheFirst } = mod as unknown as Mod;
      let version = 0;
      const network = makeNetwork({
        'https://x.test/doc': () => ({ status: 200, body: `v${++version}` }),
      });
      const { ctx, settle } = makeCtx(mod as unknown as Mod, network.fetch);

      // Prime the cache with v1 via a plain network round trip.
      await cacheFirst(new Request('https://x.test/doc'), ctx);
      expect(network.calls).to.equal(1);

      network.setDelay(5);
      const stale = await staleWhileRevalidate(new Request('https://x.test/doc'), ctx);
      expect(await stale.text(), 'SWR must return the stale cached body without waiting on the network').to.equal(
        'v1',
      );

      await settle();
      const refreshed = await cacheFirst(new Request('https://x.test/doc'), ctx);
      expect(await refreshed.text(), 'after the background refresh settles the cache should hold the new body').to.equal(
        'v2',
      );
    },
  },
  {
    name: 'staleWhileRevalidate does not cache a non-OK background refresh',
    run: async ({ mod, expect }) => {
      const { staleWhileRevalidate, cacheFirst } = mod as unknown as Mod;
      let calls = 0;
      const network = makeNetwork({
        'https://x.test/doc': () => {
          calls++;
          return calls === 1 ? { status: 200, body: 'v1' } : { status: 500, body: 'boom' };
        },
      });
      const { ctx, settle } = makeCtx(mod as unknown as Mod, network.fetch);

      await cacheFirst(new Request('https://x.test/doc'), ctx);
      const stale = await staleWhileRevalidate(new Request('https://x.test/doc'), ctx);
      expect(await stale.text()).to.equal('v1');
      await settle();

      const still = await cacheFirst(new Request('https://x.test/doc'), ctx);
      expect(await still.text(), 'a failed background refresh must not overwrite the cached entry').to.equal('v1');
    },
  },
  {
    name: 'the response returned to the caller is a usable clone -- its body is still readable',
    run: async ({ mod, expect }) => {
      const { cacheFirst } = mod as unknown as Mod;
      const network = makeNetwork({ 'https://x.test/a': () => ({ status: 200, body: 'clone-me' }) });
      const { ctx } = makeCtx(mod as unknown as Mod, network.fetch);

      const response = await cacheFirst(new Request('https://x.test/a'), ctx);
      const body = await response.text();
      expect(body, 'the caller-facing response body must still be readable after caching').to.equal('clone-me');
    },
  },
];
