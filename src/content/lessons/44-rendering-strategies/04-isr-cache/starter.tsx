import { useRef, useState } from 'react';

export type Render = (key: string) => Promise<string>;
export type Clock = () => number;

export type IsrCache = {
  get(key: string, render: Render): Promise<string>;
  invalidate(key: string): void;
};

/**
 * A minimal stale-while-revalidate cache for rendered pages. See prompt.md
 * for the exact behavior of `get` and `invalidate`.
 */
export function createIsrCache(options: { revalidateSeconds: number; clock: Clock }): IsrCache {
  // TODO: implement
  return {
    async get(_key, _render) {
      throw new Error('not implemented');
    },
    invalidate(_key) {
      throw new Error('not implemented');
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
