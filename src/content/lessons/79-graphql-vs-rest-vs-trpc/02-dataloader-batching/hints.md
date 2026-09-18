Keep three pieces of loader-scoped state: the `cache` (given or a fresh `Map`), a queue
of keys waiting to be batched, and a map from key to the list of `{ resolve, reject }`
pairs waiting on it (a list, not a single pair, because two `load()` calls for the same
uncached key in the same tick both need to hear the answer).
---
`load(key)`: if `cache.has(key)`, return `cache.get(key)!` immediately — don't touch the
queue at all. Otherwise build a `new Promise<V>((resolve, reject) => { ...push key onto
the queue, push {resolve, reject} onto that key's waiter list... })`, `cache.set(key,
promise)` before returning it, and — if no flush is already scheduled —
`queueMicrotask(flush)` and mark one as scheduled so a second `load()` in the same tick
doesn't schedule a second flush.
---
`flush()`: snapshot and clear the queue and the waiters map (so calls made *during*
`batchFn`'s await land in a fresh batch, not this one), `[...new Set(queue)]` for the
deduplicated key list, call `batchFn(uniqueKeys)`, and on success loop
`uniqueKeys.forEach((key, i) => { const result = results[i]; for (const {resolve,
reject} of waiters.get(key) ?? []) result instanceof Error ? reject(result) :
resolve(result); })`. If `batchFn` itself rejects (not a per-key `Error`, the whole
promise rejecting), reject every waiter across every key with that same error.
---
`loadMany(keys)`: `Promise.all(keys.map((k) => load(k).catch((e) => e as Error)))` — the
`.catch` is what turns a per-key rejection into a value in the result array instead of
failing the whole `Promise.all`.
---
`clear`/`clearAll` are just `cache.delete(key)` and `cache.clear()`. They only need to
affect the cache — an in-flight batch that already queued that key still resolves
normally; clearing only changes what happens on the *next* `load()` call for that key.
