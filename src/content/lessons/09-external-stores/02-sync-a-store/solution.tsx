import { useRef, useSyncExternalStore } from 'react';

export type CounterState = { count: number; label: string };

export type Store<T> = {
  getState: () => T;
  setState: (updater: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createStore<T>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState: (updater) => {
      state = typeof updater === 'function' ? (updater as (prev: T) => T)(state) : updater;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const store = createStore<CounterState>({ count: 0, label: 'widgets' });

function useStore<T, S>(source: Store<T>, selector: (state: T) => S): S {
  return useSyncExternalStore(source.subscribe, () => selector(source.getState()));
}

function useRenderCount() {
  const count = useRef(0);
  count.current += 1;
  return count.current;
}

function CountDisplay() {
  const count = useStore(store, (s) => s.count);
  const renders = useRenderCount();
  return (
    <p data-testid="count" data-renders={renders}>
      {count}
    </p>
  );
}

function SecondaryCountDisplay() {
  const count = useStore(store, (s) => s.count);
  return <p data-testid="count-secondary">{count}</p>;
}

function LabelDisplay() {
  const label = useStore(store, (s) => s.label.toUpperCase());
  const renders = useRenderCount();
  return (
    <p data-testid="label" data-renders={renders}>
      {label}
    </p>
  );
}

export default function App() {
  return (
    <main>
      <h1>Store demo</h1>
      <CountDisplay />
      <SecondaryCountDisplay />
      <LabelDisplay />
      <button onClick={() => store.setState((s) => ({ ...s, count: s.count + 1 }))}>Increment</button>
    </main>
  );
}
