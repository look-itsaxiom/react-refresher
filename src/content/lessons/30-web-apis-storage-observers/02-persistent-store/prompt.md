`createPersistentStore` is stubbed out below with a version that keeps state in memory
via plain `useState` and never touches storage at all. Replace it with a real
implementation matching this shape:

```ts
type PersistentStoreOptions<T> = {
  storage?: StorageLike;              // default: window.localStorage
  version?: number;                   // default: 1
  migrate?: (oldData: unknown, oldVersion: number) => T;
};

function createPersistentStore<T>(
  key: string,
  initial: T,
  options?: PersistentStoreOptions<T>,
): () => [T, (updater: T | ((prev: T) => T)) => void]
```

It returns a **hook** — call the returned function inside a component to get a
`[value, setValue]` pair, like a persisted `useState`. Requirements:

1. **On first read**, look up `key` in storage. If nothing is there, use `initial`.
2. The stored value is JSON of the shape `{ version: number, data: T }`. If the stored
   `version` matches the current `version`, use `data` directly.
3. If the stored `version` is older and a `migrate` function was passed, call
   `migrate(data, storedVersion)` and use its result. If no `migrate` was passed, or the
   stored JSON doesn't even parse, fall back to `initial` — never throw and never render
   garbage.
4. **Every write** (`setValue`) must serialize `{ version, data: newValue }` back into
   storage, not just update in-memory state.
5. **Subscribe with `useSyncExternalStore`**, not `useState` + manual re-render logic.
6. **Cross-tab sync:** storage fires a `storage` event on `window` in *other* tabs when a
   key changes. Listen for it (filtering by `event.key === key`), re-read the value from
   storage, and notify your subscribers so every component using this store updates.

Don't change `Counter`, `SecondaryCounter`, or `App`. They already call the hook the same
way regardless of how you implement it.
