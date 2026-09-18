import { useEffect, useState } from 'react';

export type BatchFn<K, V> = (keys: K[]) => Promise<(V | Error)[]>;
export type LoaderOptions<K, V> = { cache?: Map<K, Promise<V>> };
export type Loader<K, V> = {
  load: (key: K) => Promise<V>;
  loadMany: (keys: K[]) => Promise<(V | Error)[]>;
  clear: (key: K) => void;
  clearAll: () => void;
};

// TODO: implement the batching loader described in the prompt.
//
// - `load(key)`: return the cached promise if one exists; otherwise create a new
//   promise, register its resolve/reject alongside the key, and schedule a
//   `queueMicrotask` flush (only once per tick).
// - The scheduled flush: dedupe the queued keys, clear the queue/waiters for the *next*
//   batch, call `batchFn(uniqueKeys)`, and fan each result back out to every waiter for
//   that key — reject with an `Error` result, resolve otherwise. If `batchFn` itself
//   rejects, reject every pending waiter with that error.
// - `loadMany`: `Promise.all` over `load(key).catch((e) => e as Error)`.
// - `clear`/`clearAll`: remove from the cache only.
export function createLoader<K, V>(batchFn: BatchFn<K, V>, options: LoaderOptions<K, V> = {}): Loader<K, V> {
  const cache = options.cache ?? new Map<K, Promise<V>>();

  function load(key: K): Promise<V> {
    if (cache.has(key)) return cache.get(key)!;
    const promise = batchFn([key]).then((results) => {
      const result = results[0]!;
      if (result instanceof Error) throw result;
      return result;
    });
    cache.set(key, promise);
    return promise;
  }

  function loadMany(keys: K[]): Promise<(V | Error)[]> {
    return Promise.all(keys.map((key) => load(key).catch((e) => e as Error)));
  }

  function clear(key: K): void {
    cache.delete(key);
  }

  function clearAll(): void {
    cache.clear();
  }

  return { load, loadMany, clear, clearAll };
}

// --- Sample "resolvers" for the preview, simulating a per-request user loader.

type UserRecord = { id: string; name: string };
const users: Record<string, UserRecord> = {
  '1': { id: '1', name: 'Ada' },
  '2': { id: '2', name: 'Grace' },
  '3': { id: '3', name: 'Katherine' },
};

let batchCallCount = 0;
const userLoader = createLoader<string, UserRecord>(async (keys) => {
  batchCallCount += 1;
  return keys.map((key) => users[key] ?? new Error(`no user with id ${key}`));
});

async function loadPreviewResults() {
  // Ten "resolvers" all asking for a user in the same tick — should still be one batch call.
  const promises = [
    userLoader.load('1'),
    userLoader.load('2'),
    userLoader.load('1'),
    userLoader.load('3'),
    userLoader.load('2'),
  ];
  const results = await Promise.all(promises.map((p) => p.catch((e) => e as Error)));
  return { results, batchCallCount };
}

export default function App() {
  const [state, setState] = useState<{
    results: (UserRecord | Error)[];
    batchCallCount: number;
  } | null>(null);

  useEffect(() => {
    loadPreviewResults().then(setState);
  }, []);

  if (!state) return <p style={{ padding: 16 }}>Loading…</p>;

  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <p>batchFn was called {state.batchCallCount} time(s) for 5 `load()` calls.</p>
      <ul>
        {state.results.map((r, i) => (
          <li key={i}>{r instanceof Error ? `error: ${r.message}` : `${r.id}: ${r.name}`}</li>
        ))}
      </ul>
    </div>
  );
}
