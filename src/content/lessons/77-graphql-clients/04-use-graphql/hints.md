Keep three pieces of state per request key, in a module-level `Map`, not in React state:
`{ loading, data, error }` (the snapshot components read), the raw `root` shape from the
last successful `normalize()` (so you can re-denormalize after a cache change without
re-fetching), and the set of entity keys that response touched (so you know which cache
notifications matter to this key). A `Set<() => void>` of listeners per key is what
`useSyncExternalStore`'s `subscribe` adds to and removes from.

---

Subscribe to the cache **once, at module scope**, not once per hook call:

```ts
subscribe(cache, (changedKeys) => {
  for (const [key, record] of requests) {
    if (record.root && record.dependsOn.some((k) => changedKeys.includes(k))) {
      record.snapshot = { ...record.snapshot, data: denormalize(cache, record.root) };
      for (const listener of record.listeners) listener();
    }
  }
});
```

That one subscription is what makes an optimistic `writeEntity` from a mutation reach
every `useGraphQL` call anywhere in the tree that happens to depend on the same entity,
without the mutation hook knowing anything about who's subscribed.

---

`useSyncExternalStore(subscribeFn, getSnapshot)` — `getSnapshot` must be a plain read,
not a computation: `() => getOrCreateRecord(key).snapshot`. Do the actual
`denormalize()` work inside the code that reacts to a fetch resolving or a cache
notification, store the *result* on the record's `snapshot` field, and let `getSnapshot`
just return that field. If `getSnapshot` recomputes a fresh object every call, React
sees a "changed" value on every render and either loops or warns.

---

Kick off the initial fetch from a `useEffect`, keyed on the request key string (not the
`variables` object — build the key as `` `${document}:${JSON.stringify(variables)}` ``
so identical variables produce the identical key even though the object itself is a new
reference every render). Guard the effect body with an `inFlight`/`hasData` check on the
record before calling `transport`, so two components mounting with the same key in the
same commit only trigger one call between them.

---

For rollback in `useMutationGQL`, snapshot with a plain object copy *before* merging the
optimistic guess in:

```ts
const priorByKey: Record<string, Record<string, unknown> | undefined> = {};
for (const key of Object.keys(guessEntities)) priorByKey[key] = cache.entities[key];
mergeEntities(cache, guessEntities);
// ...on failure:
for (const key of Object.keys(guessEntities)) {
  if (priorByKey[key] === undefined) evict(cache, { __ref: key });
  else writeEntity(cache, { __ref: key }, priorByKey[key]!);
}
```

`writeEntity` merges the snapshot's fields back on top of the optimistic ones, which is
enough to undo a guess that only changed fields that already existed.
