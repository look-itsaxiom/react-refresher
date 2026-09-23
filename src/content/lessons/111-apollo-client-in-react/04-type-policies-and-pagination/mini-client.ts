// Read-only support file: the InMemoryCache primitives from the previous exercise, extended
// with the two things Apollo's typePolicies actually add — keyFields (composite entity
// identity) and a place to store the result of an argumented field (fieldStorageKey, plus
// the ROOT_QUERY entity Apollo itself uses for top-level query fields). App.tsx builds
// mergeWithKeyArgs / relayStyleMerge / useTasksConnection / deleteTask on top of this.

export type EntityKey = string; // `${__typename}:${id}` — or `${__typename}:${keyFields.join(':')}`
export type Ref = { __ref: EntityKey };
export type Entities = Record<EntityKey, Record<string, unknown>>;

export type TypePolicies = {
  [typename: string]: { keyFields?: string[] };
};

export type Cache = {
  entities: Entities;
  listeners: Set<(changedKeys: string[]) => void>;
  typePolicies: TypePolicies;
};

export function createCache(typePolicies: TypePolicies = {}): Cache {
  return { entities: {}, listeners: new Set(), typePolicies };
}

export function subscribe(cache: Cache, listener: (changedKeys: string[]) => void): () => void {
  cache.listeners.add(listener);
  return () => cache.listeners.delete(listener);
}

function notify(cache: Cache, changedKeys: string[]) {
  if (changedKeys.length === 0) return;
  for (const listener of cache.listeners) listener(changedKeys);
}

/** `Typename:id`, unless a `keyFields` typePolicy says the identity is a different (possibly
 * composite) set of fields — e.g. `keyFields: ['userId', 'orgId']` on `Membership`. */
export function identify(cache: Cache, obj: Record<string, unknown>): EntityKey {
  const typename = String(obj.__typename);
  const keyFields = cache.typePolicies[typename]?.keyFields ?? ['id'];
  return `${typename}:${keyFields.map((field) => obj[field]).join(':')}`;
}

/** Normalizes one flat entity object into the store (merging onto anything already there
 * under its identity) and returns a ref to it. Our demo entities (Task, Membership) have no
 * nested entities of their own, so this doesn't need to recurse. */
export function mergeEntity(cache: Cache, obj: Record<string, unknown>): Ref {
  const key = identify(cache, obj);
  cache.entities[key] = { ...cache.entities[key], ...obj };
  notify(cache, [key]);
  return { __ref: key };
}

export function readEntity(cache: Cache, ref: Ref): Record<string, unknown> | undefined {
  return cache.entities[ref.__ref];
}

export function evict(cache: Cache, ref: Ref): void {
  delete cache.entities[ref.__ref];
  notify(cache, [ref.__ref]);
}

/** Apollo stores top-level query fields on a synthetic `ROOT_QUERY` entity, keyed by field
 * name plus whatever `keyArgs` says is part of that field's identity — same idea here. */
export function fieldStorageKey(fieldName: string, keyArgs: string[] | false, args: Record<string, unknown> | undefined): string {
  if (keyArgs === false || keyArgs.length === 0) return fieldName;
  const parts = keyArgs.map((k) => `${k}:${JSON.stringify(args?.[k])}`);
  return `${fieldName}(${parts.join(',')})`;
}

export function writeRootField(cache: Cache, storageKey: string, value: unknown): void {
  cache.entities['ROOT_QUERY'] = { ...cache.entities['ROOT_QUERY'], [storageKey]: value };
  notify(cache, [`ROOT_QUERY.${storageKey}`]);
}

export function readRootField<T>(cache: Cache, storageKey: string): T | undefined {
  return cache.entities['ROOT_QUERY']?.[storageKey] as T | undefined;
}

function collectRefs(value: unknown, out: Ref[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, out);
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.__ref === 'string' && Object.keys(obj).length === 1) {
      out.push(obj as Ref);
      return;
    }
    for (const v of Object.values(obj)) collectRefs(v, out);
  }
}

function dropDanglingRefs(value: unknown, cache: Cache): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => dropDanglingRefs(item, cache))
      .filter((item) => {
        // Drop the whole array entry (e.g. a connection's `{ cursor, node }` edge) if any
        // ref reachable inside it points at an entity that no longer exists — not just a
        // bare `{ __ref }` element itself.
        const refs: Ref[] = [];
        collectRefs(item, refs);
        return refs.every((ref) => Boolean(cache.entities[ref.__ref]));
      });
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.__ref === 'string' && Object.keys(obj).length === 1) return obj;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = dropDanglingRefs(v, cache);
    return out;
  }
  return value;
}

/** Sweeps every `ROOT_QUERY` field, dropping array entries whose `{ __ref }` points at an
 * entity `evict` already removed. Returns the number of storage keys that changed. */
export function gc(cache: Cache): number {
  const root = cache.entities['ROOT_QUERY'];
  if (!root) return 0;
  let changedCount = 0;
  const changedKeys: string[] = [];
  for (const [storageKey, value] of Object.entries(root)) {
    const refs: Ref[] = [];
    collectRefs(value, refs);
    const hasDangling = refs.some((ref) => !cache.entities[ref.__ref]);
    if (hasDangling) {
      root[storageKey] = dropDanglingRefs(value, cache);
      changedCount += 1;
      changedKeys.push(`ROOT_QUERY.${storageKey}`);
    }
  }
  notify(cache, changedKeys);
  return changedCount;
}

// --- Fake link: a `ProjectTasks(projectId, first, after)` relay-style connection and a
// `DeleteTask(id)` mutation. Fully implemented. ---

export type Task = { __typename: 'Task'; id: string; title: string; projectId: string };
/** A stored, normalized edge — `node` is a ref into `cache.entities`, not an embedded
 * object, so `gc` can tell when the entity it points at has been evicted. */
export type Edge = { cursor: string; node: Ref };
export type PageInfo = { endCursor: string | null; hasNextPage: boolean };
export type Connection = { edges: Edge[]; pageInfo: PageInfo };

/** The shape the fake link actually resolves with — nodes are full entities here, the way
 * a real GraphQL response would send them; normalizing them into refs is the client's job. */
export type RawConnection = { edges: { cursor: string; node: Task }[]; pageInfo: PageInfo };

export const PAGE_SIZE = 2;

const tasksByProject: Record<string, Task[]> = {
  p1: [
    { __typename: 'Task', id: 't1', title: 'Design schema', projectId: 'p1' },
    { __typename: 'Task', id: 't2', title: 'Write resolvers', projectId: 'p1' },
    { __typename: 'Task', id: 't3', title: 'Wire up client', projectId: 'p1' },
  ],
  p2: [
    { __typename: 'Task', id: 'u1', title: 'Draft RFC', projectId: 'p2' },
    { __typename: 'Task', id: 'u2', title: 'Review RFC', projectId: 'p2' },
  ],
};

export type LinkResult = { data?: Record<string, unknown>; errors?: { message: string }[] };
export type LinkOperation =
  | { document: { operation: 'ProjectTasks' }; variables: { projectId: string; first: number; after: string | null } }
  | { document: { operation: 'DeleteTask' }; variables: { id: string } };

export const linkStats = { calls: 0, byOperation: {} as Record<string, number> };

export function link(op: LinkOperation): Promise<LinkResult> {
  linkStats.calls += 1;
  linkStats.byOperation[op.document.operation] = (linkStats.byOperation[op.document.operation] ?? 0) + 1;
  return new Promise((resolve) => {
    setTimeout(() => {
      if (op.document.operation === 'ProjectTasks') {
        const { projectId, first, after } = op.variables as { projectId: string; first: number; after: string | null };
        const all = tasksByProject[projectId] ?? [];
        const startIndex = after ? all.findIndex((t) => t.id === after) + 1 : 0;
        const page = all.slice(startIndex, startIndex + first);
        const endIndex = startIndex + page.length;
        const connection: RawConnection = {
          edges: page.map((task) => ({ cursor: task.id, node: task })),
          pageInfo: { endCursor: page.length ? page[page.length - 1]!.id : after, hasNextPage: endIndex < all.length },
        };
        resolve({ data: { tasksConnection: connection } });
      } else {
        const { id } = op.variables as { id: string };
        for (const projectId of Object.keys(tasksByProject)) {
          tasksByProject[projectId] = tasksByProject[projectId]!.filter((t) => t.id !== id);
        }
        resolve({ data: { deleteTask: { __typename: 'Task', id } } });
      }
    }, 10);
  });
}

export const client = {
  cache: createCache({ Membership: { keyFields: ['userId', 'orgId'] } }),
  link,
};
