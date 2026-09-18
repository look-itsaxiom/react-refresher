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

export function createCache(): Cache {
  return { entities: {}, listeners: new Set() };
}

export function subscribe(cache: Cache, listener: (changedKeys: EntityKey[]) => void): () => void {
  cache.listeners.add(listener);
  return () => cache.listeners.delete(listener);
}

function notify(cache: Cache, changedKeys: EntityKey[]) {
  if (changedKeys.length === 0) return;
  for (const listener of cache.listeners) listener(changedKeys);
}

function walkNormalize(
  value: unknown,
  entities: Entities,
  typenameKey: string,
  idOf: (obj: Record<string, unknown>) => string | number | undefined,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => walkNormalize(item, entities, typenameKey, idOf));
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const fields: Record<string, unknown> = {};
    for (const [key, fieldValue] of Object.entries(obj)) {
      fields[key] = walkNormalize(fieldValue, entities, typenameKey, idOf);
    }
    const typename = obj[typenameKey];
    const id = idOf(obj);
    if (typeof typename === 'string' && id !== undefined) {
      const entityKey = `${typename}:${id}`;
      entities[entityKey] = { ...entities[entityKey], ...fields };
      return { __ref: entityKey };
    }
    return fields;
  }
  return value;
}

export function normalize(
  data: Record<string, unknown>,
  options?: NormalizeOptions,
): { entities: Entities; root: Record<string, unknown> } {
  const typenameKey = options?.typenameKey ?? '__typename';
  const idOf = options?.idOf ?? ((obj: Record<string, unknown>) => obj.id as string | number | undefined);
  const entities: Entities = {};
  const root = walkNormalize(data, entities, typenameKey, idOf) as Record<string, unknown>;
  return { entities, root };
}

export function mergeEntities(cache: Cache, entities: Entities): void {
  const changed: EntityKey[] = [];
  for (const [key, fields] of Object.entries(entities)) {
    cache.entities[key] = { ...cache.entities[key], ...fields };
    changed.push(key);
  }
  notify(cache, changed);
}

class MissingEntity {}

function walkDenormalize(cache: Cache, value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => walkDenormalize(cache, item));
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.__ref === 'string' && Object.keys(obj).length === 1) {
      const entity = cache.entities[obj.__ref];
      if (!entity) throw new MissingEntity();
      return walkDenormalize(cache, entity);
    }
    const out: Record<string, unknown> = {};
    for (const [key, fieldValue] of Object.entries(obj)) {
      out[key] = walkDenormalize(cache, fieldValue);
    }
    return out;
  }
  return value;
}

export function denormalize<T>(cache: Cache, shape: T): T | undefined {
  try {
    return walkDenormalize(cache, shape) as T;
  } catch (e) {
    if (e instanceof MissingEntity) return undefined;
    throw e;
  }
}

export function writeEntity(cache: Cache, ref: Ref, patch: Record<string, unknown>): void {
  cache.entities[ref.__ref] = { ...cache.entities[ref.__ref], ...patch };
  notify(cache, [ref.__ref]);
}

export function evict(cache: Cache, ref: Ref): void {
  delete cache.entities[ref.__ref];
  notify(cache, [ref.__ref]);
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
