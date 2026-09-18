import { useEffect, useState } from 'react';

export type BatchFn<K, V> = (keys: K[]) => Promise<(V | Error)[]>;
export type LoaderOptions<K, V> = { cache?: Map<K, Promise<V>> };
export type Loader<K, V> = {
  load: (key: K) => Promise<V>;
  loadMany: (keys: K[]) => Promise<(V | Error)[]>;
  clear: (key: K) => void;
  clearAll: () => void;
};

type Waiter<V> = { resolve: (value: V) => void; reject: (reason: unknown) => void };

export function createLoader<K, V>(batchFn: BatchFn<K, V>, options: LoaderOptions<K, V> = {}): Loader<K, V> {
  const cache = options.cache ?? new Map<K, Promise<V>>();

  let queue: K[] = [];
  let waiters = new Map<K, Waiter<V>[]>();
  let flushScheduled = false;

  function scheduleFlush(): void {
    if (flushScheduled) return;
    flushScheduled = true;
    queueMicrotask(flush);
  }

  function flush(): void {
    const queuedKeys = queue;
    const pendingWaiters = waiters;
    queue = [];
    waiters = new Map();
    flushScheduled = false;

    const uniqueKeys = [...new Set(queuedKeys)];

    batchFn(uniqueKeys).then(
      (results) => {
        uniqueKeys.forEach((key, index) => {
          const result = results[index];
          const keyWaiters = pendingWaiters.get(key) ?? [];
          for (const waiter of keyWaiters) {
            if (result instanceof Error) waiter.reject(result);
            else waiter.resolve(result as V);
          }
        });
      },
      (error: unknown) => {
        for (const keyWaiters of pendingWaiters.values()) {
          for (const waiter of keyWaiters) waiter.reject(error);
        }
      },
    );
  }

  function load(key: K): Promise<V> {
    const cached = cache.get(key);
    if (cached) return cached;

    const promise = new Promise<V>((resolve, reject) => {
      const keyWaiters = waiters.get(key) ?? [];
      keyWaiters.push({ resolve, reject });
      waiters.set(key, keyWaiters);
      queue.push(key);
    });

    cache.set(key, promise);
    scheduleFlush();
    return promise;
  }

  function loadMany(keys: K[]): Promise<(V | Error)[]> {
    return Promise.all(keys.map((key) => load(key).catch((error: unknown) => error as Error)));
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
