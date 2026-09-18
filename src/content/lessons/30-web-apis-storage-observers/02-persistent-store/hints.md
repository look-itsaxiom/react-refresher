Structure it as: a module-level `let state: T` seeded by a `readFromStorage()` function
run once when `createPersistentStore` is called, plus a `Set<() => void>` of listeners.
`setValue` updates `state`, writes `JSON.stringify({ version, data: state })` to
storage, then calls every listener. The returned hook is just
`useSyncExternalStore(subscribe, () => state)` paired with `setValue`.
---
`readFromStorage()` needs three branches after `storage.getItem(key)`: nothing stored →
`initial`; JSON.parse throws → `initial`; parses fine → check `parsed.version`. If it
equals the current version, return `parsed.data`. If it's older and `migrate` exists,
return `migrate(parsed.data, parsed.version)`. Otherwise fall back to `initial`. Wrap the
whole thing in one `try { ... } catch { return initial; }` so a parse failure can't throw
past this function.
---
For cross-tab sync, add a `window.addEventListener('storage', handler)` inside
`subscribe`, and remove it in the returned cleanup function alongside deleting the
listener from your `Set`. The handler should ignore events for other keys
(`if (event.key !== key) return;`), then re-run `readFromStorage()` to refresh `state`
before calling the listener — don't try to parse `event.newValue` yourself, you already
have a function that does the parsing and migration correctly.
---
Full shape:

```tsx
function createPersistentStore<T>(key: string, initial: T, options: PersistentStoreOptions<T> = {}) {
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
    listeners.forEach((l) => l());
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
```
