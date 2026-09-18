import { useSyncExternalStore } from 'react';

// --- Mini `create`, already correct from the previous exercise. Don't change this. ---
type Listener = () => void;
type Updater<T> = Partial<T> | ((state: T) => Partial<T>);
type SetState<T> = (updater: Updater<T>) => void;
type Initializer<T> = (set: SetState<T>, get: () => T) => T;

export type BoundStore<T> = {
  <S>(selector: (state: T) => S): S;
  getState: () => T;
  setState: SetState<T>;
};

export function create<T extends object>(initializer: Initializer<T>): BoundStore<T> {
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

  function useStore<S>(selector: (state: T) => S): S {
    return useSyncExternalStore(subscribe, () => selector(getState()));
  }
  useStore.getState = getState;
  useStore.setState = setState;
  return useStore as BoundStore<T>;
}

// --- A persist-like middleware miniature. Also already correct. Don't change this. ---
export type Storage = { getItem: (name: string) => string | null; setItem: (name: string, value: string) => void };

export function createInMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (name) => map.get(name) ?? null,
    setItem: (name, value) => map.set(name, value),
  };
}

function persist<T extends object>(initializer: Initializer<T>, options: { name: string; storage: Storage }): Initializer<T> {
  return (set, get) => {
    const persistingSet: SetState<T> = (updater) => {
      set(updater);
      options.storage.setItem(options.name, JSON.stringify(get()));
    };
    const initialState = initializer(persistingSet, get);
    const raw = options.storage.getItem(options.name);
    if (!raw) return initialState;
    return { ...initialState, ...(JSON.parse(raw) as Partial<T>) };
  };
}

// --- The cart itself, fixed. ---

// Stands in for product data fetched elsewhere (a TanStack Query result, say). The store
// never copies these fields into its own state — it looks them up by id when needed.
export const CATALOG: Record<string, { name: string; price: number }> = {
  mug: { name: 'Mug', price: 12 },
  hat: { name: 'Hat', price: 20 },
  socks: { name: 'Socks', price: 8 },
};

// Every id used in this exercise is a real CATALOG key, so this assertion is safe here.
function getProduct(id: string) {
  return CATALOG[id]!;
}

// FIX: only the store's own data — id and quantity. Name and price live in CATALOG.
type CartItem = { id: string; quantity: number };

type CartState = {
  items: CartItem[];
  addItem: (id: string) => void;
  removeItem: (id: string) => void;
};

// FIX: total is computed on demand from items + CATALOG, never stored, so there's nothing
// for an action to forget to keep in sync.
export function selectTotal(state: CartState): number {
  return state.items.reduce((sum, item) => sum + getProduct(item.id).price * item.quantity, 0);
}

export function createCartStore(storage: Storage) {
  return create<CartState>(
    persist(
      (set) => ({
        items: [],
        addItem: (id) => {
          set((s) => {
            const existing = s.items.find((i) => i.id === id);
            const items = existing
              ? s.items.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i))
              : [...s.items, { id, quantity: 1 }];
            return { items };
          });
        },
        removeItem: (id) => {
          set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        },
      }),
      { name: 'cart', storage },
    ),
  );
}

export const defaultStorage = createInMemoryStorage();
export const useCartStore = createCartStore(defaultStorage);

function CartLines() {
  const items = useCartStore((s) => s.items);
  return (
    <ul>
      {items.map((item) => {
        const product = getProduct(item.id);
        return (
          <li key={item.id} data-testid={`line-${item.id}`}>
            {product.name} x{item.quantity} (${product.price * item.quantity})
          </li>
        );
      })}
    </ul>
  );
}

function CartTotal() {
  const total = useCartStore(selectTotal);
  return <p data-testid="total">{total}</p>;
}

export default function App() {
  return (
    <main>
      <h1>Cart</h1>
      <button onClick={() => useCartStore.getState().addItem('mug')}>Add mug</button>
      <button onClick={() => useCartStore.getState().addItem('hat')}>Add hat</button>
      <button onClick={() => useCartStore.getState().removeItem('mug')}>Remove mug</button>
      <CartLines />
      <CartTotal />
    </main>
  );
}
