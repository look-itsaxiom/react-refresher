# Zustand patterns and the alternatives

Real Zustand (v5) is the miniature you just built, plus a selector library and a set of
composable middleware. This is what it looks like in an app that can actually install it.

## Store shape and selectors

```tsx
import { create } from 'zustand';

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

// in a component
const itemCount = useCartStore((s) => s.items.length);
```

Actions live **inside** the store next to the state they touch, not in a separate
"actions" file — `set` and `get` are closed over at creation time, so `addItem` doesn't
need React at all and can be called from a test, a keyboard shortcut handler, or another
store. This is the same shape your `create` miniature exposed: state and the functions
that mutate it are one object.

A selector that returns a primitive (`s.items.length`) or an existing reference from state
bails out re-renders automatically, exactly like your `getSnapshot` fix. A selector that
returns a **new object or array literal** — `(s) => ({ count: s.items.length, id: s.id })`
— never does, because it allocates a fresh object every call and `Object.is` never
matches. In Zustand v5 this isn't just a missed optimization: an unmemoized object
selector consumed with the default equality function throws a "Maximum update depth
exceeded" error, because rendering triggers a new snapshot, which triggers a re-render,
forever. The fix is `useShallow`:

```tsx
import { useShallow } from 'zustand/react/shallow';

const { count, id } = useCartStore(useShallow((s) => ({ count: s.items.length, id: s.id })));
```

`useShallow` compares the object's own properties one level deep instead of by reference,
so it re-renders only when one of those properties actually changed — the shallow-equal
version of what a primitive selector gets for free.

## Slices, for stores that outgrow one file

Once a store's initializer gets long, split it into **slices** — one creator function per
domain, combined into a single `create` call:

```tsx
type CartSlice = { items: CartItem[]; addItem: (i: CartItem) => void };
type UserSlice = { userId: string | null; setUserId: (id: string) => void };

const createCartSlice: StateCreator<CartSlice & UserSlice, [], [], CartSlice> = (set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
});

const createUserSlice: StateCreator<CartSlice & UserSlice, [], [], UserSlice> = (set) => ({
  userId: null,
  setUserId: (userId) => set({ userId }),
});

export const useStore = create<CartSlice & UserSlice>()((...a) => ({
  ...createCartSlice(...a),
  ...createUserSlice(...a),
}));
```

It's still one store — one `subscribe`, one `getState` — just composed from typed pieces.
Zustand's guidance is to apply middleware (below) once, around the combined store, not
inside individual slices.

## Middleware: persist, devtools, immer

Middleware wraps the initializer, the same way your `create`'s `initializer` argument
could be wrapped by a `persist`-shaped function:

```tsx
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set) => ({ items: [], addItem: (item) => set((s) => ({ items: [...s.items, item] })) }),
      { name: 'cart-storage' }, // localStorage key; pass storage: createJSONStorage(() => sessionStorage) to change it
    ),
    { name: 'cart-store' },
  ),
);
```

- **`persist`** serializes state to `localStorage` (or any storage you supply) on every
  change and rehydrates from it on load. As of v5 it no longer snapshots the initial state
  at store-creation time — rehydration only replaces what was actually persisted.
- **`devtools`** connects the store to the Redux DevTools extension for free time-travel
  debugging, independent of whether you use Redux anywhere.
- **`immer`** lets `set` take a mutating recipe (`set((draft) => { draft.items.push(item) })`)
  instead of a spread, useful once nested updates get deep enough that `{ ...s, a: { ...s.a,
  b } }` stops being readable.

## Testing and resetting stores

Because a store is just a module-level object, a test can call `useCartStore.setState(...)`
directly to arrange state, and `useCartStore.getState()` to assert on it, with no render
required. The one thing to watch: state persists across tests in the same module instance,
so reset it (usually to a captured initial snapshot) in an `afterEach`, the same way the
`server.reset()` helper in this course's `@server/*` fakes resets between checks.

## The alternatives

- **Jotai** is atomic rather than store-shaped: instead of one object with many keys, you
  define many small `atom()`s and compose them, and a component only subscribes to the
  atoms it reads via `useAtom`. There's no selector to get wrong, because granularity is
  the default — the tradeoff is that cross-cutting logic (reset all, log every change)
  needs its own composition instead of one middleware pass.
- **Redux Toolkit** is still the most-used state library by raw adoption, and still worth
  it when you want RTK Query's normalized cache and generated hooks, a large team that
  benefits from Redux's rigid action/reducer/selector separation, or existing Redux
  infrastructure (DevTools workflows, middleware, sagas) you're not replacing. For new
  client-state-only stores it's more ceremony than Zustand or Jotai for the same result.
- **XState** is for state that is a *machine*, not a bag of values — a multi-step
  checkout, a media player, a wizard with illegal transitions that should be
  unrepresentable (you can't be "submitting" and "submitted" at once). Modeling that as
  booleans in a Zustand store (`isLoading`, `isSubmitting`, `hasError`) lets you
  accidentally set combinations that make no sense; a state chart makes them impossible to
  reach.

## Anti-patterns

- **Storing derived data.** A `total` field kept in sync by hand in every action that
  touches `items` will eventually be wrong in the one action that forgot. Compute it in a
  selector instead — it can't go stale because it's never stored.
- **Mirroring server data.** Copying a TanStack Query result into a Zustand store to "make
  it easier to access" creates a second cache with none of the first one's invalidation
  logic. Keep server data in the query cache; read it there, or pass the pieces the store
  actually needs (an id, not the whole record).
- **One giant store for the whole app.** Nothing stops you from putting everything in a
  single `create` call, but it reintroduces the granularity problem selectors exist to
  solve, and it means every unrelated feature team touches the same file. Multiple small
  stores, or slices inside one store, keep concerns separable.

## Further reading (optional)

- [Zustand: comparison with other libraries](https://zustand.docs.pmnd.rs/getting-started/comparison) — zustand.docs.pmnd.rs
- [Zustand: `useShallow`](https://zustand.docs.pmnd.rs/hooks/use-shallow) — zustand.docs.pmnd.rs
- [Zustand: Slices pattern](https://zustand.docs.pmnd.rs/guides/typescript#slices-pattern) — zustand.docs.pmnd.rs
- [Zustand: `persist` middleware](https://zustand.docs.pmnd.rs/integrations/persisting-store-data) — zustand.docs.pmnd.rs
- [Jotai: core concepts](https://jotai.org/docs/core/atom) — jotai.org
- [XState: quick start](https://stately.ai/docs/quick-start) — stately.ai
