Build the batching loader described in the concept step: a `createLoader(batchFn,
options)` that coalesces every `load(key)` call made in the same tick into one call to
`batchFn`, caches results per key, and reports per-key errors without failing the whole
batch.

`App.tsx` gives you the types and a tiny default `App` that calls the loader and renders
the results. `createLoader` itself is left for you.

## `createLoader<K, V>(batchFn, options?)`

```ts
type BatchFn<K, V> = (keys: K[]) => Promise<(V | Error)[]>;
type LoaderOptions<K, V> = { cache?: Map<K, Promise<V>> };
type Loader<K, V> = {
  load(key: K): Promise<V>;
  loadMany(keys: K[]): Promise<(V | Error)[]>;
  clear(key: K): void;
  clearAll(): void;
};
```

- **`load(key)`** returns a promise for that key's value. If `load` has already been
  called for this key (and not since cleared), return the **same cached promise**
  instead of registering the key again.
- Keys registered by separate `load()` calls that happen **before the current tick's
  microtask queue is drained** must be coalesced into a single `batchFn(keys)` call.
  Two synchronous calls to `load(1)` and `load(2)` — even from two different
  "resolvers" — should produce one `batchFn(['1', '2'])` call, not two. Schedule the
  flush with `queueMicrotask`.
- **Deduplicate** keys before calling `batchFn` — if `load('1')` is called twice in the
  same tick (and isn't cached yet from a *previous* tick), `batchFn` should still only
  see `'1'` once — but both callers' promises must resolve from that one result.
- `batchFn`'s result array is **order-preserving**: result `i` corresponds to the
  deduplicated key at index `i`. If that entry is an `Error` instance, every `load()`
  call waiting on that key should **reject** with it; otherwise every one should
  **resolve** with it. One bad key must never affect any other key's promise.
- **`loadMany(keys)`** calls `load` for each key and returns a promise for an array
  where each position is either the resolved value or the `Error` that key rejected
  with (never throws itself).
- **`clear(key)`** removes one key from the cache, so a future `load(key)` triggers a
  fresh `batchFn` call. **`clearAll()`** clears every cached key.
- Accept an optional `cache` (a `Map`) in `options`, defaulting to a fresh one per
  loader — this is what makes "per-request" caching possible: a new loader (and cache)
  is meant to be created for every incoming request.
