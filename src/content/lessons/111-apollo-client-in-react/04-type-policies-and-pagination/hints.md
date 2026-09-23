Start with `mergeWithKeyArgs` and `relayStyleMerge` — both are pure functions you can
reason about without touching React at all, and `useTasksConnection` is just wiring one
of them (`relayStyleMerge`) to `ROOT_QUERY` storage.

---

```ts
export function mergeWithKeyArgs(existing: Ref[] | undefined, incoming: Ref[]): Ref[] {
  if (!existing) return incoming;
  const seen = new Set(existing.map((ref) => ref.__ref));
  return [...existing, ...incoming.filter((ref) => !seen.has(ref.__ref))];
}
```

`relayStyleMerge` is the same idea, one level deeper (dedupe `edges` by `cursor` instead
of a bare ref array), plus carrying `pageInfo` through unchanged from `incoming`.

---

For `useTasksConnection`, the storage key only needs computing once per `projectId`:

```ts
const storageKey = fieldStorageKey('tasksConnection', ['projectId'], { projectId });
```

Two different `projectId`s produce two different strings here — that's the entire
mechanism behind the isolation check, nothing else has to know about it.

---

The mount effect:

```ts
useEffect(() => {
  if (readRootField<Connection>(client.cache, storageKey) === undefined) {
    fetchPage(projectId, null).then((page) => {
      writeRootField(client.cache, storageKey, relayStyleMerge(undefined, page));
    });
  }
  return subscribe(client.cache, (changedKeys) => {
    if (changedKeys.includes(`ROOT_QUERY.${storageKey}`)) setTick((t) => t + 1);
  });
}, [storageKey]);
```

`setTick` (a `useState(0)` you don't otherwise read) is enough to force a re-render —
the *data* itself is read straight from the cache on every render (see below), not kept
in component state, so there's nothing to keep in sync besides "did this storage key
change."

---

`fetchMore` reads the *current* cached connection first, because that's where this
exercise's `endCursor` and `hasNextPage` live:

```ts
const fetchMore = useCallback(() => {
  const current = readRootField<Connection>(client.cache, storageKey);
  if (!current?.pageInfo.hasNextPage) return;
  fetchPage(projectId, current.pageInfo.endCursor).then((page) => {
    const merged = relayStyleMerge(readRootField<Connection>(client.cache, storageKey), page);
    writeRootField(client.cache, storageKey, merged);
  });
}, [storageKey, projectId]);
```

Re-reading the storage key right before merging (rather than reusing the outer
`current`) matters if something else wrote to it in between — unlikely in this demo, but
it's the same reasoning `cache.modify`'s updater functions use in real Apollo.

---

Deriving `items` for the render:

```ts
const connection = readRootField<Connection>(client.cache, storageKey);
const items = (connection?.edges ?? [])
  .map((edge) => readEntity(client.cache, edge.node))
  .filter((task): task is Task => Boolean(task));
```

The `filter(Boolean)` matters after a delete: `gc` already dropped the dangling edge, but
even before that runs, a stale read shouldn't crash on a missing entity.

---

`deleteTask` is three lines, in this order — mutate, evict, gc:

```ts
export async function deleteTask(id: string): Promise<void> {
  await client.link({ document: { operation: 'DeleteTask' }, variables: { id } });
  evict(client.cache, { __ref: `Task:${id}` });
  gc(client.cache);
}
```
