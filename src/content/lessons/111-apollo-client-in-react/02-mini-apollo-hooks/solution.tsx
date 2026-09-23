import { useCallback, useEffect, useRef, useState } from 'react';

// --- A fake link, standing in for Apollo's HttpLink/MockLink chain. Fully implemented.
// Apollo's own tests use exactly this shape for a link: (operation) => Promise<{ data, errors? }>.
// Our "documents" are plain objects instead of parsed GraphQL — { operation, root } is enough
// to route the fake link and to know which key of the response holds the result.

export type QueryDoc = { operation: 'ListTasks' | 'GetTask'; root: 'tasks' | 'task' };
export type MutationDoc = { operation: 'AddTask' };
export type LinkResult = { data?: Record<string, unknown>; errors?: { message: string }[] };
export type LinkOperation = { document: QueryDoc | MutationDoc; variables?: Record<string, unknown> };
export type Link = (op: LinkOperation) => Promise<LinkResult>;

type Task = { __typename: 'Task'; id: string; title: string; done: boolean };

let nextId = 3;
const db: Record<string, Task> = {
  '1': { __typename: 'Task', id: '1', title: 'Write docs', done: false },
  '2': { __typename: 'Task', id: '2', title: 'Ship it', done: true },
};

export const linkStats = { calls: 0, byOperation: {} as Record<string, number> };
let pendingFailure: string | null = null;
/** Make the *next* link call resolve with a GraphQL error, once. */
export function failNextRequest(message = 'network error'): void {
  pendingFailure = message;
}

export const link: Link = (op) => {
  linkStats.calls += 1;
  linkStats.byOperation[op.document.operation] = (linkStats.byOperation[op.document.operation] ?? 0) + 1;
  return new Promise((resolve) => {
    setTimeout(() => {
      if (pendingFailure) {
        const message = pendingFailure;
        pendingFailure = null;
        resolve({ errors: [{ message }] });
        return;
      }
      if (op.document.operation === 'ListTasks') {
        resolve({ data: { tasks: Object.values(db) } });
      } else if (op.document.operation === 'GetTask') {
        const task = db[String(op.variables?.id)];
        resolve(task ? { data: { task } } : { errors: [{ message: 'not found' }] });
      } else if (op.document.operation === 'AddTask') {
        const id = String(nextId++);
        const task: Task = { __typename: 'Task', id, title: String(op.variables?.title), done: false };
        db[id] = task;
        resolve({ data: { addTask: task } });
      } else {
        resolve({ errors: [{ message: `unknown operation` }] });
      }
    }, 40);
  });
};

// --- InMemoryCache miniature. `identify` is fully implemented (same `Typename:id` key you
// built in lesson 77); the query-shaped API around it — readQuery/writeQuery/modify/watch —
// is Apollo's actual surface and is what you're implementing here. ---

export type EntityKey = string; // `${__typename}:${id}`
export type Cache = {
  entities: Record<EntityKey, Record<string, unknown>>;
  /** queryKey -> ordered entity keys, for a query whose root is a list. */
  entityIds: Record<string, EntityKey[]>;
  /** queryKey -> single entity key, for a query whose root is one entity. */
  entityRefs: Record<string, EntityKey>;
  listeners: Set<(changedKeys: string[]) => void>;
};

export function createCache(): Cache {
  return { entities: {}, entityIds: {}, entityRefs: {}, listeners: new Set() };
}

export function identify(obj: { __typename: string; id: string | number }): EntityKey {
  return `${obj.__typename}:${obj.id}`;
}

function notify(cache: Cache, changedKeys: string[]) {
  if (changedKeys.length === 0) return;
  for (const listener of cache.listeners) listener(changedKeys);
}

function queryKeyOf(document: QueryDoc, variables: Record<string, unknown> | undefined): string {
  return `${document.operation}:${JSON.stringify(variables ?? {})}`;
}

export function readQuery(
  cache: Cache,
  document: QueryDoc,
  variables?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const key = queryKeyOf(document, variables);
  const ids = cache.entityIds[key];
  if (ids) {
    if (ids.some((id) => !cache.entities[id])) return undefined;
    return { [document.root]: ids.map((id) => cache.entities[id]) };
  }
  const ref = cache.entityRefs[key];
  if (ref) {
    if (!cache.entities[ref]) return undefined;
    return { [document.root]: cache.entities[ref] };
  }
  return undefined;
}

export function writeQuery(
  cache: Cache,
  document: QueryDoc,
  variables: Record<string, unknown> | undefined,
  data: Record<string, unknown>,
): void {
  const key = queryKeyOf(document, variables);
  const value = data[document.root];
  const touched: string[] = [];
  if (Array.isArray(value)) {
    const ids = value.map((obj: Record<string, unknown>) => {
      const id = identify(obj as { __typename: string; id: string | number });
      cache.entities[id] = { ...cache.entities[id], ...obj };
      touched.push(id);
      return id;
    });
    cache.entityIds[key] = ids;
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const id = identify(obj as { __typename: string; id: string | number });
    cache.entities[id] = { ...cache.entities[id], ...obj };
    cache.entityRefs[key] = id;
    touched.push(id);
  }
  notify(cache, [...touched, `Query:${key}`]);
}

export function modify(cache: Cache, id: EntityKey, fields: Record<string, unknown | ((existing: unknown) => unknown)>): void {
  const existing = cache.entities[id] ?? {};
  const patch: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(fields)) {
    patch[field] = typeof value === 'function' ? (value as (existing: unknown) => unknown)(existing[field]) : value;
  }
  cache.entities[id] = { ...existing, ...patch };
  notify(cache, [id]);
}

/** Deletes an entity outright. Fully implemented — evict alone leaves dangling ids in
 * entityIds/entityRefs (see readQuery); step 4's `gc` is what sweeps those up. */
export function evict(cache: Cache, id: EntityKey): void {
  delete cache.entities[id];
  notify(cache, [id]);
}

export function watch(
  cache: Cache,
  document: QueryDoc,
  variables: Record<string, unknown> | undefined,
  cb: () => void,
): () => void {
  const key = queryKeyOf(document, variables);
  const listener = (changedKeys: string[]) => {
    if (changedKeys.includes(`Query:${key}`)) {
      cb();
      return;
    }
    const deps = cache.entityIds[key] ?? (cache.entityRefs[key] ? [cache.entityRefs[key]] : []);
    if (deps.some((depId) => changedKeys.includes(depId))) cb();
  };
  cache.listeners.add(listener);
  return () => cache.listeners.delete(listener);
}

// --- One client instance, shared by every hook call in this file (same pattern as lesson
// 77's module-level cache: a real app would reach this through an ApolloProvider). ---
export const client = { cache: createCache(), link };

const inFlight = new Map<string, Promise<LinkResult>>();
/** Share one in-flight network call per operation across concurrently-mounted queries —
 * the miniature's stand-in for Apollo's default request deduplication. Fully implemented. */
function fetchDeduped(document: QueryDoc, variables?: Record<string, unknown>): Promise<LinkResult> {
  const key = queryKeyOf(document, variables);
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = client.link({ document, variables }).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

export type FetchPolicy = 'cache-first' | 'network-only' | 'cache-and-network';

export function useQuery<T>(
  document: QueryDoc,
  options?: { variables?: Record<string, unknown>; fetchPolicy?: FetchPolicy },
): { data: T | undefined; loading: boolean; error: string | null; refetch: () => void } {
  const variables = options?.variables;
  const fetchPolicy = options?.fetchPolicy ?? 'cache-first';
  const key = queryKeyOf(document, variables);

  const [state, setState] = useState<{ data: T | undefined; loading: boolean; error: string | null }>(() => {
    const cached = readQuery(client.cache, document, variables) as T | undefined;
    return cached ? { data: cached, loading: false, error: null } : { data: undefined, loading: true, error: null };
  });

  const runFetch = useCallback(
    (request: Promise<LinkResult>) => {
      request.then(
        (result) => {
          if (result.errors && result.errors.length > 0) {
            setState((prev) => ({ data: prev.data, loading: false, error: result.errors![0]!.message }));
            return;
          }
          writeQuery(client.cache, document, variables, result.data ?? {});
          const fresh = readQuery(client.cache, document, variables) as T | undefined;
          setState({ data: fresh, loading: false, error: null });
        },
        (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          setState((prev) => ({ data: prev.data, loading: false, error: message }));
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  useEffect(() => {
    const cachedHit = readQuery(client.cache, document, variables) !== undefined;
    if (fetchPolicy === 'cache-first') {
      if (!cachedHit) {
        setState((prev) => ({ ...prev, loading: true }));
        runFetch(fetchDeduped(document, variables));
      }
    } else {
      setState((prev) => ({ ...prev, loading: prev.data === undefined }));
      runFetch(client.link({ document, variables }));
    }
    const unsubscribe = watch(client.cache, document, variables, () => {
      const fresh = readQuery(client.cache, document, variables) as T | undefined;
      if (fresh !== undefined) setState({ data: fresh, loading: false, error: null });
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fetchPolicy]);

  const refetch = useCallback(() => {
    runFetch(client.link({ document, variables }));
  }, [runFetch, document, variables]);

  return { data: state.data, loading: state.loading, error: state.error, refetch };
}

export function useMutation<TVars extends Record<string, unknown>>(
  document: MutationDoc,
  options?: {
    optimisticResponse?: (variables: TVars) => Record<string, unknown>;
    update?: (cache: Cache, result: { data?: Record<string, unknown> }, variables: TVars) => void;
  },
): [mutate: (variables: TVars) => Promise<Record<string, unknown> | undefined>, state: { loading: boolean; error: string | null }] {
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

  const mutate = useCallback(
    async (variables: TVars) => {
      setState({ loading: true, error: null });
      const snapshot = options?.optimisticResponse ? snapshotCache(client.cache) : undefined;
      if (options?.optimisticResponse) {
        options.update?.(client.cache, { data: options.optimisticResponse(variables) }, variables);
      }
      try {
        const result = await client.link({ document, variables });
        if (result.errors && result.errors.length > 0) {
          if (snapshot) restoreCache(client.cache, snapshot);
          setState({ loading: false, error: result.errors[0]!.message });
          throw new Error(result.errors[0]!.message);
        }
        options?.update?.(client.cache, result, variables);
        setState({ loading: false, error: null });
        return result.data;
      } catch (err) {
        if (snapshot) restoreCache(client.cache, snapshot);
        const message = err instanceof Error ? err.message : String(err);
        setState({ loading: false, error: message });
        throw err;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [document],
  );

  return [mutate, state];
}

// --- Rollback helpers for useMutation. Fully implemented; snapshotting the whole (tiny)
// cache is simpler than tracking exactly which keys an arbitrary `update` touched. ---
export function snapshotCache(cache: Cache): Pick<Cache, 'entities' | 'entityIds' | 'entityRefs'> {
  return {
    entities: structuredClone(cache.entities),
    entityIds: structuredClone(cache.entityIds),
    entityRefs: structuredClone(cache.entityRefs),
  };
}
export function restoreCache(cache: Cache, snapshot: Pick<Cache, 'entities' | 'entityIds' | 'entityRefs'>): void {
  const changed = new Set<string>();
  for (const key of new Set([...Object.keys(cache.entities), ...Object.keys(snapshot.entities)])) changed.add(key);
  for (const key of new Set([...Object.keys(cache.entityIds), ...Object.keys(snapshot.entityIds)])) changed.add(`Query:${key}`);
  for (const key of new Set([...Object.keys(cache.entityRefs), ...Object.keys(snapshot.entityRefs)])) changed.add(`Query:${key}`);
  cache.entities = snapshot.entities;
  cache.entityIds = snapshot.entityIds;
  cache.entityRefs = snapshot.entityRefs;
  notify(cache, [...changed]);
}

// --- Demo components. ---

const listTasksDoc: QueryDoc = { operation: 'ListTasks', root: 'tasks' };
const getTaskDoc: QueryDoc = { operation: 'GetTask', root: 'task' };
const addTaskDoc: MutationDoc = { operation: 'AddTask' };

export function TaskList({ fetchPolicy = 'cache-first' as FetchPolicy }: { fetchPolicy?: FetchPolicy }) {
  const { data, loading, error } = useQuery<{ tasks: Task[] }>(listTasksDoc, { fetchPolicy });
  if (error) return <p data-testid="task-list-error">{error}</p>;
  if (loading && !data) return <p data-testid="task-list-loading">Loading…</p>;
  return (
    <ul data-testid="task-list">
      {(data?.tasks ?? []).map((t) => (
        <li key={t.id} data-testid={`task-${t.id}`}>
          {t.title}
        </li>
      ))}
    </ul>
  );
}

export function TaskRow({ id, testId }: { id: string; testId: string }) {
  const renders = useRef(0);
  renders.current += 1;
  const { data } = useQuery<{ task: Task }>(getTaskDoc, { variables: { id }, fetchPolicy: 'cache-first' });
  return (
    <p data-testid={testId} data-renders={renders.current}>
      {data ? data.task.title : 'missing'}
    </p>
  );
}

export function AddTask() {
  const [mutate, { loading, error }] = useMutation<{ title: string }>(addTaskDoc, {
    optimisticResponse: (vars) => ({ addTask: { __typename: 'Task', id: 'temp-id', title: vars.title, done: false } }),
    update: (cache, result, vars) => {
      const added = result.data?.addTask as Task | undefined;
      if (!added) return;
      const current = readQuery(cache, listTasksDoc, undefined) as { tasks: Task[] } | undefined;
      const withoutTemp = (current?.tasks ?? []).filter((t) => t.id !== 'temp-id');
      writeQuery(cache, listTasksDoc, undefined, { tasks: [...withoutTemp, added] });
      void vars;
    },
  });
  return (
    <div>
      <button onClick={() => void mutate({ title: 'New task' }).catch(() => {})} disabled={loading}>
        Add task
      </button>
      {error ? <p data-testid="add-task-error">{error}</p> : null}
    </div>
  );
}

export default function App() {
  return (
    <div>
      <TaskList />
      <AddTask />
    </div>
  );
}
