import { useState } from 'react';

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type PersistentStoreOptions<T> = {
  storage?: StorageLike;
  version?: number;
  migrate?: (oldData: unknown, oldVersion: number) => T;
};

const STORE_KEY = 'lesson30-counter-store';

// BUG: this never reads from or writes to storage at all — it's an in-memory useState
// wearing a disguise. Replace it with a real implementation (see the prompt).
function createPersistentStore<T>(
  key: string,
  initial: T,
  _options: PersistentStoreOptions<T> = {},
): () => [T, (updater: T | ((prev: T) => T)) => void] {
  void key;
  return function usePersistentValue(): [T, (updater: T | ((prev: T) => T)) => void] {
    const [value, setValue] = useState(initial);
    return [value, setValue];
  };
}

const usePersistentCounter = createPersistentStore<{ count: number }>(STORE_KEY, { count: 0 }, {
  version: 2,
  migrate: (oldData, oldVersion) => {
    // v1 stored a bare number instead of an object.
    if (oldVersion === 1 && typeof oldData === 'number') return { count: oldData };
    return { count: 0 };
  },
});

function Counter() {
  const [state, setState] = usePersistentCounter();
  return (
    <p data-testid="value">
      {state.count}
      <button onClick={() => setState((s) => ({ count: s.count + 1 }))}>Increment</button>
    </p>
  );
}

function SecondaryCounter() {
  const [state] = usePersistentCounter();
  return <p data-testid="value-secondary">{state.count}</p>;
}

export default function App() {
  return (
    <main>
      <h1>Persistent counter</h1>
      <Counter />
      <SecondaryCounter />
    </main>
  );
}
