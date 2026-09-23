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

// TODO: read a query's current value out of the cache.
// - Compute the queryKey (see queryKeyOf above).
// - If cache.entityIds has that key (a list query): every id must still be present in
//   cache.entities (evict can leave a dangling id) — if any is missing, return undefined
//   (a cache miss, same ruling as lesson 77's denormalize); otherwise return
//   `{ [document.root]: ids.map(id => cache.entities[id]) }`.
// - Else if cache.entityRefs has that key (a single-entity query): same idea, one entity.
// - Else: cache miss, return undefined.
export function readQuery(
  cache: Cache,
  document: QueryDoc,
  variables?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  return undefined;
}

// TODO: write a query response into the cache.
// - `data[document.root]` is either an array of entities (list query) or a single entity
//   (single-entity query) — normalize whichever it is with `identify`, merging each
//   entity's fields onto anything already stored under that key (incoming wins).
// - Record the result under the queryKey: an ordered id array in cache.entityIds for a
//   list, or a single key in cache.entityRefs for a single entity.
// - Notify listeners with every entity key you touched, plus `Query:${queryKey}` (so a
//   watcher of this exact query re-reads even when the *set* of ids changed, not just an
//   entity's fields).
export function writeQuery(
  cache: Cache,
  document: QueryDoc,
  variables: Record<string, unknown> | undefined,
  data: Record<string, unknown>,
): void {
  // TODO
}

// TODO: patch one entity by key. `fields` values are either a literal replacement or an
// updater `(existing) => next` (this is Apollo's real `cache.modify` shape). Merge the
// result onto cache.entities[id] and notify listeners with exactly [id] — nothing else.
export function modify(cache: Cache, id: EntityKey, fields: Record<string, unknown | ((existing: unknown) => unknown)>): void {
  // TODO
}

/** Deletes an entity outright. Fully implemented — evict alone leaves dangling ids in
 * entityIds/entityRefs (see readQuery); step 4's `gc` is what sweeps those up. */
export function evict(cache: Cache, id: EntityKey): void {
  delete cache.entities[id];
  notify(cache, [id]);
}

// TODO: subscribe to exactly the cache changes that affect one query's result.
// - Compute the queryKey.
// - On every cache notification, fire `cb()` if the changed keys include
//   `Query:${queryKey}` (the query's id-set changed), OR if they overlap the query's
//   *current* dependencies — `cache.entityIds[queryKey]` (a list) or
//   `[cache.entityRefs[queryKey]]` (a single ref), when that dependency exists.
// - Return the unsubscribe function.
// This is what makes `modify('Task:1', ...)` re-render every query result containing
// Task:1, and only those — the render-isolation check in this exercise depends on it.
export function watch(
  cache: Cache,
  document: QueryDoc,
  variables: Record<string, unknown> | undefined,
  cb: () => void,
): () => void {
  return () => {};
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

// TODO: useQuery(document, { variables, fetchPolicy })
// - Initial state (via useState's lazy initializer, so the very first render can already
//   show cached data with no flash of "loading"): read the cache with readQuery. If it's
//   a hit, start with { data, loading: false, error: null }. If it's a miss, start with
//   { data: undefined, loading: true, error: null }.
// - In an effect keyed on the document + variables identity:
//   - 'cache-first': if the initial read was already a hit, do nothing — no network call.
//     Otherwise fetch via `fetchDeduped` (shared across components asking for the same
//     query+variables at once).
//   - 'network-only': always call `client.link` directly (bypass fetchDeduped — every
//     mounted component gets its own request).
//   - 'cache-and-network': always call `client.link` directly too, but the initial state
//     above already showed cached data first if there was any.
//   - Once a request resolves: on `errors`, set `{ data: (keep previous), loading: false,
//     error: message }`. On success, `writeQuery` the response into the cache, then read
//     it back and set `{ data, loading: false, error: null }`.
// - Also subscribe with `watch` so a cache change from *outside* this hook (another
//   component's fetch, a mutation's optimistic write, a `modify` call) updates this
//   query's state too. Clean up the subscription on unmount / dependency change.
// - `refetch()`: force a fresh `client.link` call for this document+variables and write
//   the result in, regardless of fetchPolicy.
export function useQuery<T>(
  document: QueryDoc,
  options?: { variables?: Record<string, unknown>; fetchPolicy?: FetchPolicy },
): { data: T | undefined; loading: boolean; error: string | null; refetch: () => void } {
  return { data: undefined, loading: true, error: null, refetch: () => {} };
}

// TODO: useMutation(document, { optimisticResponse, update })
// `mutate(variables)`:
// 1. Set loading true, error null.
// 2. If `options.optimisticResponse` is given: snapshot the cache first (`snapshotCache`,
//    below — already implemented), compute the guess with `options.optimisticResponse(variables)`,
//    and call `options.update?.(client.cache, { data: guess }, variables)` — this is what
//    makes the guess visible immediately, by writing it into the cache the same way a real
//    response would.
// 3. Call `client.link({ document, variables })`.
//    - On rejection or a response with `errors`: if you snapshotted, `restoreCache` it,
//      set `{ loading: false, error: message }`, and re-throw.
//    - On success: call `options.update?.(client.cache, result, variables)` again with the
//      *real* result (this is what reconciles a temp id with the server's real one — see
//      the demo `update` below), set `{ loading: false, error: null }`, return `result.data`.
export function useMutation<TVars extends Record<string, unknown>>(
  document: MutationDoc,
  options?: {
    optimisticResponse?: (variables: TVars) => Record<string, unknown>;
    update?: (cache: Cache, result: { data?: Record<string, unknown> }, variables: TVars) => void;
  },
): [mutate: (variables: TVars) => Promise<Record<string, unknown> | undefined>, state: { loading: boolean; error: string | null }] {
  const mutate = useCallback(async (_variables: TVars) => undefined, []);
  return [mutate, { loading: false, error: null }];
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
