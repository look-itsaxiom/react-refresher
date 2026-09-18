No GraphQL client is importable here, so you'll build the mechanic from the concept step
directly: a tiny normalized cache, the same shape Apollo's `InMemoryCache` or urql's
Graphcache use internally, just without type policies or exchanges around it.

`App.tsx` has the types and a `createCache()` that's already correct. Four functions are
left as `TODO`.

## 1. `normalize(data, options?)`

```ts
function normalize(
  data: Record<string, unknown>,
  options?: { typenameKey?: string; idOf?: (obj: Record<string, unknown>) => string | number | undefined },
): { entities: Entities; root: Record<string, unknown> }
```

Walk `data` recursively. For every plain object you encounter:

- If it has a `typenameKey` field (default `'__typename'`) **and** `idOf` returns
  something other than `undefined` for it (default `idOf` reads `.id`), it's an
  **entity**: build its key as `` `${typename}:${id}` ``, recursively normalize its own
  fields the same way, store the result into `entities[key]` (merge onto whatever's
  already there under that key — the same entity can appear twice in one response), and
  return `{ __ref: key }` in its place.
- Otherwise it's an **embedded object** (no identity of its own — think an address or a
  money amount): recursively normalize its fields and return the plain object, no ref.
- Arrays map element-by-element through the same rule.
- Anything else (string, number, boolean, null) passes through unchanged.

Return `{ entities, root }`, where `root` is `data` with every entity replaced by its
`{ __ref }`.

## 2. `denormalize(cache, shape)`

```ts
function denormalize<T>(cache: Cache, shape: T): T | undefined
```

Walk `shape` (typically a `root` you got from `normalize`, or a piece of one) the same
way, but in reverse: whenever you hit a `{ __ref }`, look it up in `cache.entities`. If
it's missing, the **whole `denormalize` call** returns `undefined` — the caller's job is
to notice that and refetch, not to render half a query result. If it's present, recurse
into the found entity's own fields (they may contain further refs) and splice the result
in. Plain objects and arrays recurse field-by-field / element-by-element, propagating a
missing ref upward the same way.

## 3. `writeEntity(cache, ref, patch)` and `evict(cache, ref)`

`writeEntity` merges `patch` onto `cache.entities[ref.__ref]` (creating it if absent) and
notifies subscribers with `[ref.__ref]`. `evict` deletes `cache.entities[ref.__ref]` and
notifies subscribers the same way. Both are how a mutation response or an optimistic
update reaches every query result built from that entity — this is the primitive
lesson 78's `useMutationGQL` will build on.

## 4. `mergeEntities(cache, entities)`

Used after a fresh `normalize()` call to fold its `entities` into the shared `cache`:
merge each incoming entity onto any existing one at that key (incoming fields win),
collect every key that changed, and notify subscribers once with that full list — not
once per key.

`subscribe` and `createCache` are already implemented; don't change their shape, the
checks call them directly.
