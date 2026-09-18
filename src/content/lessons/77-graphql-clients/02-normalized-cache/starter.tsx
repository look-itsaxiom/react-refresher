export type EntityKey = string; // `${typename}:${id}`
export type Ref = { __ref: EntityKey };
export type Entities = Record<EntityKey, Record<string, unknown>>;
export type Cache = {
  entities: Entities;
  listeners: Set<(changedKeys: EntityKey[]) => void>;
};

export type NormalizeOptions = {
  typenameKey?: string;
  idOf?: (obj: Record<string, unknown>) => string | number | undefined;
};

/** A fresh, empty normalized cache. Fully implemented — don't change its shape. */
export function createCache(): Cache {
  return { entities: {}, listeners: new Set() };
}

/** Subscribe to entity changes; returns an unsubscribe function. Fully implemented. */
export function subscribe(cache: Cache, listener: (changedKeys: EntityKey[]) => void): () => void {
  cache.listeners.add(listener);
  return () => cache.listeners.delete(listener);
}

function notify(cache: Cache, changedKeys: EntityKey[]) {
  if (changedKeys.length === 0) return;
  for (const listener of cache.listeners) listener(changedKeys);
}

// TODO: flatten `data` into { entities, root }. See prompt.md part 1.
// - default typenameKey is '__typename'
// - default idOf reads obj.id
// - an object with a resolvable typename+id becomes an entity: store its (recursively
//   normalized) fields under `${typename}:${id}` in `entities` (merging onto anything
//   already there under that key), and return `{ __ref: key }` in its place.
// - an object without a resolvable identity is embedded: recursively normalize its
//   fields, return the plain object (no ref).
// - arrays map element-by-element; scalars pass through unchanged.
export function normalize(
  data: Record<string, unknown>,
  options?: NormalizeOptions,
): { entities: Entities; root: Record<string, unknown> } {
  return { entities: {}, root: data };
}

// TODO: fold `entities` into `cache.entities` (incoming fields win per key, merged onto
// any existing entity at that key), then notify listeners once with every key that
// changed. See prompt.md part 4.
export function mergeEntities(cache: Cache, entities: Entities): void {
  // TODO
}

// TODO: reconstruct `shape` by following every `{ __ref }` it contains into
// `cache.entities`, recursively (an entity's own fields may contain further refs).
// Return `undefined` — the whole call, not just the missing branch — if any referenced
// entity is absent from the cache. See prompt.md part 2.
export function denormalize<T>(cache: Cache, shape: T): T | undefined {
  return shape;
}

// TODO: merge `patch` onto cache.entities[ref.__ref] (create it if absent), notify
// listeners with [ref.__ref]. See prompt.md part 3.
export function writeEntity(cache: Cache, ref: Ref, patch: Record<string, unknown>): void {
  // TODO
}

// TODO: delete cache.entities[ref.__ref], notify listeners with [ref.__ref].
export function evict(cache: Cache, ref: Ref): void {
  // TODO
}

// --- Demo wiring, purely so the preview shows something. ---

const demoCache = createCache();
const response = {
  user: {
    __typename: 'User',
    id: '1',
    name: 'Ada Lovelace',
    posts: [{ __typename: 'Post', id: '9', title: 'Normalizing responses' }],
  },
};
const { entities, root } = normalize(response);
mergeEntities(demoCache, entities);
const result = denormalize(demoCache, root);

export default function App() {
  return (
    <pre style={{ padding: 16, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      {JSON.stringify({ entityKeys: Object.keys(demoCache.entities), result }, null, 2)}
    </pre>
  );
}
