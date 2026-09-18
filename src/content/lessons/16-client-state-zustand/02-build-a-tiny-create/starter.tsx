import { useRef, useSyncExternalStore } from 'react';

type Listener = () => void;
type Updater<T> = Partial<T> | ((state: T) => Partial<T>);
type SetState<T> = (updater: Updater<T>) => void;

export type BoundStore<T> = {
  <S>(selector: (state: T) => S): S;
  getState: () => T;
  setState: SetState<T>;
};

export function create<T extends object>(initializer: (set: SetState<T>, get: () => T) => T): BoundStore<T> {
  let state: T;
  const listeners = new Set<Listener>();

  const getState = () => state;

  const setState: SetState<T> = (updater) => {
    const partial = typeof updater === 'function' ? (updater as (state: T) => Partial<T>)(state) : updater;
    state = { ...state, ...partial };
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  state = initializer(setState, getState);

  // BUG: getSnapshot ignores the selector and returns the whole state object, so
  // useSyncExternalStore always sees a "new" snapshot (setState always makes a fresh
  // object) and re-renders every subscriber, no matter which slice it actually reads.
  function useStore<S>(selector: (state: T) => S): S {
    const fullState = useSyncExternalStore(subscribe, getState);
    return selector(fullState);
  }

  useStore.getState = getState;
  useStore.setState = setState;
  return useStore as BoundStore<T>;
}

type CartState = { count: number; label: string };

export const useCartStore = create<CartState>(() => ({ count: 0, label: 'widgets' }));

function useRenderCount() {
  const ref = useRef(0);
  ref.current += 1;
  return ref.current;
}

function CountDisplay() {
  const count = useCartStore((s) => s.count);
  const renders = useRenderCount();
  return (
    <p data-testid="count" data-renders={renders}>
      {count}
    </p>
  );
}

function LabelDisplay() {
  const label = useCartStore((s) => s.label);
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
      <h1>Mini store demo</h1>
      <CountDisplay />
      <LabelDisplay />
      <button onClick={() => useCartStore.setState((s) => ({ count: s.count + 1 }))}>Increment</button>
    </main>
  );
}
