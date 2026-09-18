import { useSyncExternalStore } from 'react';

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

function createPersistentStore<T>(
  key: string,
  initial: T,
  options: PersistentStoreOptions<T> = {},
): () => [T, (updater: T | ((prev: T) => T)) => void] {
  const storage = options.storage ?? window.localStorage;
  const version = options.version ?? 1;

  function readFromStorage(): T {
    const raw = storage.getItem(key);
    if (raw == null) return initial;
    try {
      const parsed = JSON.parse(raw) as { version: number; data: unknown };
      if (parsed.version === version) return parsed.data as T;
      if (options.migrate) return options.migrate(parsed.data, parsed.version);
      return initial;
    } catch {
      return initial;
    }
  }

  let state = readFromStorage();
  const listeners = new Set<() => void>();

  function setValue(updater: T | ((prev: T) => T)) {
    state = typeof updater === 'function' ? (updater as (prev: T) => T)(state) : updater;
    storage.setItem(key, JSON.stringify({ version, data: state }));
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      state = readFromStorage();
      listener();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }

  return function usePersistentValue(): [T, typeof setValue] {
    const snapshot = useSyncExternalStore(subscribe, () => state);
    return [snapshot, setValue];
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
