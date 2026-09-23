Start with `readQuery`/`writeQuery` and get the demo `<TaskList />` rendering a static list
before touching `useQuery`'s fetch-policy branching — it's much easier to debug the cache
functions against a component that already calls them correctly.

---

`writeQuery`'s notify call needs **both** the entity keys and the `Query:${queryKey}`
pseudo-key in the same array — `notify(cache, [...touchedEntityKeys, \`Query:${key}\`])`.
If you only notify with entity keys, a watcher whose list just grew (a new id added, no
existing entity's fields changed) never fires, because none of the *previously watched*
ids changed — only the id *set* did.

---

For `modify`, remember `fields`' values can be either a literal or a function. Something
like:

```ts
const patch: Record<string, unknown> = {};
for (const [field, value] of Object.entries(fields)) {
  patch[field] = typeof value === 'function' ? value(existing[field]) : value;
}
```

---

`watch`'s dependency check: `cache.entityIds[key] ?? (cache.entityRefs[key] ? [cache.entityRefs[key]] : [])`
gives you one array to test `changedKeys` against regardless of whether this is a list or
single-entity query.

---

For `useQuery`, the lazy `useState(() => ...)` initializer only runs once, on mount — it's
the only place you get a *synchronous* read of the cache before any effect runs. Put the
`readQuery` call there, not in the effect, or `cache-and-network`'s "cached data on the
very first render" requirement can't pass.

---

The full `useQuery` effect shape:

```ts
useEffect(() => {
  const hit = readQuery(client.cache, document, variables) !== undefined;
  if (fetchPolicy === 'cache-first') {
    if (!hit) runFetch(fetchDeduped(document, variables));
  } else {
    runFetch(client.link({ document, variables }));
  }
  return watch(client.cache, document, variables, () => {
    const fresh = readQuery(client.cache, document, variables);
    if (fresh !== undefined) setState({ data: fresh, loading: false, error: null });
  });
}, [key, fetchPolicy]);
```

where `key` is the same queryKey string `writeQuery`/`watch` compute internally, and
`runFetch` is a small shared helper that calls `writeQuery` on success or sets `error` on
failure/`errors`.

---

For `useMutation`, the ordering inside `mutate` matters: snapshot **before** applying the
optimistic write, not after — otherwise the snapshot already contains the guess and
`restoreCache` has nothing to undo.

```ts
const snapshot = options?.optimisticResponse ? snapshotCache(client.cache) : undefined;
if (options?.optimisticResponse) {
  options.update?.(client.cache, { data: options.optimisticResponse(variables) }, variables);
}
```
