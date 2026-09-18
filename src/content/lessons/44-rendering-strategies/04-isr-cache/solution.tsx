import { useRef, useState } from 'react';

export type Render = (key: string) => Promise<string>;
export type Clock = () => number;

export type IsrCache = {
  get(key: string, render: Render): Promise<string>;
  invalidate(key: string): void;
};

type CacheEntry = { html: string; renderedAt: number };

/**
 * A minimal stale-while-revalidate cache for rendered pages. See prompt.md
 * for the exact behavior of `get` and `invalidate`.
 */
export function createIsrCache(options: { revalidateSeconds: number; clock: Clock }): IsrCache {
  const { revalidateSeconds, clock } = options;
  const cache = new Map<string, CacheEntry>();
  const inFlight = new Map<string, Promise<void>>();

  function isFresh(entry: CacheEntry): boolean {
    return clock() - entry.renderedAt < revalidateSeconds * 1000;
  }

  function ensureRevalidating(key: string, render: Render): Promise<void> {
    const existing = inFlight.get(key);
    if (existing) return existing;

    const promise = render(key)
      .then((html) => {
        cache.set(key, { html, renderedAt: clock() });
      })
      .finally(() => {
        inFlight.delete(key);
      });
    inFlight.set(key, promise);
    return promise;
  }

  return {
    async get(key, render) {
      const entry = cache.get(key);

      if (entry && isFresh(entry)) {
        return entry.html;
      }

      if (entry) {
        // Stale: serve immediately, revalidate in the background (deduped).
        void ensureRevalidating(key, render);
        return entry.html;
      }

      // Cold miss: nothing to fall back to, block on a render (deduped
      // against any concurrent cold miss for the same key).
      await ensureRevalidating(key, render);
      return cache.get(key)!.html;
    },

    invalidate(key) {
      cache.delete(key);
    },
  };
}

export default function App() {
  const cacheRef = useRef(createIsrCache({ revalidateSeconds: 5, clock: Date.now }));
  const renderCountRef = useRef(0);
  const [log, setLog] = useState<string[]>([]);

  const handleFetch = async () => {
    const html = await cacheRef.current.get('/home', async (key) => {
      renderCountRef.current += 1;
      return `Rendered ${key} (render #${renderCountRef.current})`;
    });
    setLog((prev) => [...prev, html]);
  };

  return (
    <div>
      <button onClick={handleFetch}>Fetch /home</button>
      <button onClick={() => cacheRef.current.invalidate('/home')}>Invalidate /home</button>
      <ul data-testid="log">
        {log.map((entry, i) => (
          <li key={i}>{entry}</li>
        ))}
      </ul>
    </div>
  );
}
