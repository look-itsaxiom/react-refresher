Write one recursive helper and reuse it for both directions. For `normalize`, something
like `walk(value): unknown` that switches on `Array.isArray(value)`, then
`value && typeof value === 'object'`, then checks whether it looks like an entity. The
top-level `root` is just `walk(data)` called on a non-entity object (an object without a
recognizable identity of its own — don't special-case the root, the "no typename+id"
branch already does the right thing for it).

---

For entities in `normalize`, don't overwrite `entities[key]` — merge:
`entities[key] = { ...entities[key], ...normalizedFields }`. The same `User:1` can show
up once as a post's author and again as a standalone `user` field in the same response;
losing fields from the first occurrence when you process the second is a real bug this
guards against.

---

`denormalize`'s recursion needs a way to signal "give up, something's missing" without
plumbing a boolean through every return type. Easiest: throw a sentinel
(`class MissingEntity {}`) from deep inside the walk when a ref lookup fails, and catch
it once at the very top of `denormalize`, returning `undefined` there. That mirrors the
`NullBubble` pattern from lesson 75's query executor, if you did that exercise.

---

`writeEntity`/`evict`/`mergeEntities` all end the same way: figure out which keys
changed, then call every function in `cache.listeners` once with that array. Don't call
listeners inside a loop per-field — batch to one notification per cache-mutating call, or
the "notified once" checks will see extra calls.

---

Skeleton for the shared walker:

```ts
function walkNormalize(value: unknown, entities: Entities, typenameKey: string, idOf: (o: Record<string, unknown>) => string | number | undefined): unknown {
  if (Array.isArray(value)) return value.map((v) => walkNormalize(v, entities, typenameKey, idOf));
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const typename = obj[typenameKey];
    const id = idOf(obj);
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) fields[k] = walkNormalize(v, entities, typenameKey, idOf);
    if (typeof typename === 'string' && id !== undefined) {
      const key = `${typename}:${id}`;
      entities[key] = { ...entities[key], ...fields };
      return { __ref: key };
    }
    return fields;
  }
  return value;
}
```

`denormalize`'s walker is the mirror image: same shape of recursion, but it reads
`cache.entities` on a `{ __ref }` node instead of writing to it, and throws when the
lookup misses.
