import { useMemo, useState } from 'react';

/**
 * A tiny stand-in for the real `Cache` interface (window.caches / SW `caches`).
 * Real service worker exercises can't run in this sandbox, so every strategy
 * below is written against these fakes instead of the real globals -- the
 * shapes match closely enough that the logic transfers directly.
 */
export class FakeCache {
  private store = new Map<string, Response>();

  async match(request: Request): Promise<Response | undefined> {
    const cached = this.store.get(request.url);
    return cached ? cached.clone() : undefined;
  }

  async put(request: Request, response: Response): Promise<void> {
    this.store.set(request.url, response);
  }

  async keys(): Promise<string[]> {
    return [...this.store.keys()];
  }

  async delete(request: Request): Promise<boolean> {
    return this.store.delete(request.url);
  }
}

/** A tiny stand-in for the real `CacheStorage` (`self.caches`). */
export class FakeCacheStorage {
  private caches = new Map<string, FakeCache>();

  async open(name: string): Promise<FakeCache> {
    let cache = this.caches.get(name);
    if (!cache) {
      cache = new FakeCache();
      this.caches.set(name, cache);
    }
    return cache;
  }

  async keys(): Promise<string[]> {
    return [...this.caches.keys()];
  }

  async delete(name: string): Promise<boolean> {
    return this.caches.delete(name);
  }
}

export type StrategyCtx = {
  caches: FakeCacheStorage;
  /** Stands in for the global `fetch` a service worker would call. */
  fetch: (request: Request) => Promise<Response>;
  cacheName: string;
  /** Stands in for `event.waitUntil` -- register background work here. */
  waitUntil: (promise: Promise<unknown>) => void;
};

export type Strategy = (request: Request, ctx: StrategyCtx) => Promise<Response>;

/**
 * Cache-first: serve from cache when present, otherwise fetch and cache the
 * (ok) result.
 */
export async function cacheFirst(request: Request, ctx: StrategyCtx): Promise<Response> {
  const cache = await ctx.caches.open(ctx.cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await ctx.fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

/**
 * Network-first: race the network against a timeout, falling back to the
 * cache if the network throws or the timeout wins.
 */
export function networkFirst({ timeoutMs }: { timeoutMs: number }): Strategy {
  return async (request: Request, ctx: StrategyCtx): Promise<Response> => {
    const cache = await ctx.caches.open(ctx.cacheName);

    const timeout = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('network-first: timed out')), timeoutMs);
    });

    try {
      const response = await Promise.race([ctx.fetch(request), timeout]);
      if (response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      throw new Error('network-first: network failed and nothing is cached');
    }
  };
}

/**
 * Stale-while-revalidate: return the cached response immediately (if any)
 * and refresh the cache from the network in the background.
 */
export async function staleWhileRevalidate(request: Request, ctx: StrategyCtx): Promise<Response> {
  const cache = await ctx.caches.open(ctx.cacheName);
  const cached = await cache.match(request);

  const refresh = ctx.fetch(request).then(async (response) => {
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  });

  // Register the background work so a caller (or a test) can await it, but
  // never let a failed background refresh become an unhandled rejection.
  ctx.waitUntil(refresh.catch(() => undefined));

  if (cached) return cached;
  return refresh;
}

const DEMO_STRATEGIES = { cacheFirst, staleWhileRevalidate } as const;

export default function App() {
  const [log, setLog] = useState<string[]>([]);
  const caches = useMemo(() => new FakeCacheStorage(), []);

  const run = async (name: keyof typeof DEMO_STRATEGIES) => {
    const request = new Request('https://example.com/greeting');
    const ctx: StrategyCtx = {
      caches,
      cacheName: 'demo-v1',
      waitUntil: () => {},
      fetch: async () => new Response(`hello (${Date.now()})`, { status: 200 }),
    };
    const response = await DEMO_STRATEGIES[name](request, ctx);
    const body = await response.text();
    setLog((prev) => [...prev, `${name}: ${body}`]);
  };

  return (
    <div>
      <button onClick={() => run('cacheFirst')}>Run cacheFirst</button>
      <button onClick={() => run('staleWhileRevalidate')}>Run staleWhileRevalidate</button>
      <ul>
        {log.map((entry, i) => (
          <li key={i}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}
