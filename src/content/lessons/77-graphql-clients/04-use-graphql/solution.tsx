import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

// --- A fake network layer, standing in for Apollo/urql's link chain. Fully implemented. ---

type GqlResponse = { data?: Record<string, unknown>; errors?: { message: string }[] };

const db: Record<string, { __typename: 'User'; id: string; name: string; email: string }> = {
  '1': { __typename: 'User', id: '1', name: 'Ada Lovelace', email: 'ada@example.com' },
};

export const stats = { requestCount: 0, byDocument: {} as Record<string, number> };
let pendingFailure: string | null = null;

/** Make the *next* transport() call reject with `message`, once. */
export function failNext(message = 'Request failed'): void {
  pendingFailure = message;
}

export function transport(document: string, variables: Record<string, unknown> = {}): Promise<GqlResponse> {
  stats.requestCount += 1;
  stats.byDocument[document] = (stats.byDocument[document] ?? 0) + 1;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (pendingFailure) {
        const message = pendingFailure;
        pendingFailure = null;
        reject(new Error(message));
        return;
      }
      const user = db[String(variables.id)];
      if (document === 'GetUser') {
        resolve({ data: { user: user ? { ...user } : null } });
      } else if (document === 'GetUserWithPosts') {
        resolve({ data: { profile: user ? { ...user } : null } });
      } else if (document === 'RenameUser') {
        if (!user) {
          resolve({ errors: [{ message: 'no such user' }] });
        } else {
          user.name = String(variables.name);
          resolve({ data: { renameUser: { ...user } } });
        }
      } else {
        resolve({ errors: [{ message: `unknown document: ${document}` }] });
      }
    }, 10);
  });
}

// --- The normalized cache from the previous exercise. Fully implemented, shared as one
// module-level `cache` instance for every hook call in this file. ---

export type EntityKey = string;
export type Ref = { __ref: EntityKey };
export type Entities = Record<EntityKey, Record<string, unknown>>;
export type Cache = { entities: Entities; listeners: Set<(keys: EntityKey[]) => void> };

export function createCache(): Cache {
  return { entities: {}, listeners: new Set() };
}

export function subscribe(c: Cache, listener: (keys: EntityKey[]) => void): () => void {
  c.listeners.add(listener);
  return () => c.listeners.delete(listener);
}

function notify(c: Cache, changedKeys: EntityKey[]) {
  if (changedKeys.length === 0) return;
  for (const listener of c.listeners) listener(changedKeys);
}

function walkNormalize(value: unknown, entities: Entities): unknown {
  if (Array.isArray(value)) return value.map((v) => walkNormalize(v, entities));
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) fields[k] = walkNormalize(v, entities);
    const typename = obj.__typename;
    const id = obj.id;
    if (typeof typename === 'string' && (typeof id === 'string' || typeof id === 'number')) {
      const key = `${typename}:${id}`;
      entities[key] = { ...entities[key], ...fields };
      return { __ref: key };
    }
    return fields;
  }
  return value;
}

export function normalize(data: Record<string, unknown>): { entities: Entities; root: Record<string, unknown> } {
  const entities: Entities = {};
  const root = walkNormalize(data, entities) as Record<string, unknown>;
  return { entities, root };
}

export function mergeEntities(c: Cache, entities: Entities): void {
  const changed: EntityKey[] = [];
  for (const [key, fields] of Object.entries(entities)) {
    c.entities[key] = { ...c.entities[key], ...fields };
    changed.push(key);
  }
  notify(c, changed);
}

class MissingEntity {}

function walkDenormalize(c: Cache, value: unknown): unknown {
  if (Array.isArray(value)) return value.map((v) => walkDenormalize(c, v));
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.__ref === 'string' && Object.keys(obj).length === 1) {
      const entity = c.entities[obj.__ref];
      if (!entity) throw new MissingEntity();
      return walkDenormalize(c, entity);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = walkDenormalize(c, v);
    return out;
  }
  return value;
}

export function denormalize<T>(c: Cache, shape: T): T | undefined {
  try {
    return walkDenormalize(c, shape) as T;
  } catch (e) {
    if (e instanceof MissingEntity) return undefined;
    throw e;
  }
}

export function writeEntity(c: Cache, ref: Ref, patch: Record<string, unknown>): void {
  c.entities[ref.__ref] = { ...c.entities[ref.__ref], ...patch };
  notify(c, [ref.__ref]);
}

export function evict(c: Cache, ref: Ref): void {
  delete c.entities[ref.__ref];
  notify(c, [ref.__ref]);
}

export const cache = createCache();

// --- useGraphQL and useMutationGQL, built on `cache` and `transport`. ---

type Snapshot = { data: unknown; loading: boolean; error: string | null };
type RequestRecord = {
  snapshot: Snapshot;
  root?: Record<string, unknown>;
  dependsOn: EntityKey[];
  inFlight: boolean;
  listeners: Set<() => void>;
};
const requests = new Map<string, RequestRecord>();

function getOrCreateRecord(key: string): RequestRecord {
  let rec = requests.get(key);
  if (!rec) {
    rec = { snapshot: { data: null, loading: true, error: null }, dependsOn: [], inFlight: false, listeners: new Set() };
    requests.set(key, rec);
  }
  return rec;
}

// One subscription for every useGraphQL call in the app: whenever the cache changes,
// any request record whose dependsOn overlaps the changed keys gets re-denormalized and
// its own listeners (the useSyncExternalStore subscribers reading that record) notified.
subscribe(cache, (changedKeys) => {
  for (const rec of requests.values()) {
    if (rec.root && rec.dependsOn.some((k) => changedKeys.includes(k))) {
      rec.snapshot = { ...rec.snapshot, data: denormalize(cache, rec.root) };
      for (const listener of rec.listeners) listener();
    }
  }
});

function runRequest(key: string, document: string, variables: Record<string, unknown>) {
  const rec = getOrCreateRecord(key);
  rec.inFlight = true;
  transport(document, variables).then(
    (res) => {
      rec.inFlight = false;
      if (res.errors && res.errors.length > 0) {
        rec.snapshot = { ...rec.snapshot, loading: false, error: res.errors[0]!.message };
      } else {
        const { entities, root } = normalize(res.data ?? {});
        rec.root = root;
        rec.dependsOn = Object.keys(entities);
        mergeEntities(cache, entities); // also runs the module-level subscription above
        rec.snapshot = { data: denormalize(cache, root), loading: false, error: null };
      }
      for (const listener of rec.listeners) listener();
    },
    (err: unknown) => {
      rec.inFlight = false;
      rec.snapshot = { ...rec.snapshot, loading: false, error: err instanceof Error ? err.message : String(err) };
      for (const listener of rec.listeners) listener();
    },
  );
}

function useGraphQL<T = unknown>(
  document: string,
  variables: Record<string, unknown> = {},
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const key = `${document}:${JSON.stringify(variables)}`;

  useEffect(() => {
    const rec = getOrCreateRecord(key);
    if (!rec.inFlight && rec.snapshot.data === null && rec.snapshot.error === null) {
      runRequest(key, document, variables);
    }
    // key fully describes document+variables; runRequest reads the latest `variables`
    // closure from this same effect run, which is fine since the key changes whenever
    // variables meaningfully change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const subscribeFn = useCallback(
    (onChange: () => void) => {
      const rec = getOrCreateRecord(key);
      rec.listeners.add(onChange);
      return () => rec.listeners.delete(onChange);
    },
    [key],
  );
  const getSnapshot = useCallback(() => getOrCreateRecord(key).snapshot, [key]);
  const snapshot = useSyncExternalStore(subscribeFn, getSnapshot);

  const refetch = useCallback(() => {
    runRequest(key, document, variables);
  }, [key, document, variables]);

  return { data: snapshot.data as T | null, loading: snapshot.loading, error: snapshot.error, refetch };
}

function useMutationGQL<TVars extends Record<string, unknown> = Record<string, unknown>>(
  document: string,
  options?: {
    optimistic?: (variables: TVars) => Record<string, unknown>;
    update?: (c: Cache, data: Record<string, unknown> | undefined, variables: TVars) => void;
  },
): [(variables: TVars) => Promise<Record<string, unknown> | undefined>, { loading: boolean; error: string | null }] {
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });

  const mutate = useCallback(
    async (variables: TVars) => {
      setState({ loading: true, error: null });
      let priorByKey: Record<string, Record<string, unknown> | undefined> | undefined;

      if (options?.optimistic) {
        const guess = options.optimistic(variables);
        const { entities } = normalize(guess);
        priorByKey = {};
        for (const key of Object.keys(entities)) priorByKey[key] = cache.entities[key];
        mergeEntities(cache, entities);
      }

      try {
        const res = await transport(document, variables);
        if (res.errors && res.errors.length > 0) throw new Error(res.errors[0]!.message);
        const { entities } = normalize(res.data ?? {});
        mergeEntities(cache, entities);
        options?.update?.(cache, res.data, variables);
        setState({ loading: false, error: null });
        return res.data;
      } catch (err) {
        if (priorByKey) {
          for (const [key, prior] of Object.entries(priorByKey)) {
            if (prior === undefined) evict(cache, { __ref: key });
            else writeEntity(cache, { __ref: key }, prior);
          }
        }
        const message = err instanceof Error ? err.message : String(err);
        setState({ loading: false, error: message });
        throw err;
      }
    },
    [document, options],
  );

  return [mutate, state];
}

// --- Demo components, wired up to show the mechanic. ---

function UserCard({ testId, document }: { testId: string; document: 'GetUser' | 'GetUserWithPosts' }) {
  const { data, loading, error } = useGraphQL<{ user?: { name: string }; profile?: { name: string } }>(document, {
    id: '1',
  });
  const name = (data?.user ?? data?.profile)?.name;
  return <p data-testid={testId}>{loading ? 'Loading…' : error ? `Error: ${error}` : name}</p>;
}

function RenameButton() {
  const [rename, { loading, error }] = useMutationGQL<{ id: string; name: string }>('RenameUser', {
    optimistic: (vars) => ({ renameUser: { __typename: 'User', id: vars.id, name: vars.name } }),
  });
  return (
    <div>
      <button
        onClick={() => {
          // The returned promise re-throws on failure (after rolling back); the UI reads
          // the failure through `error` state instead, so swallow it here.
          rename({ id: '1', name: 'Ada King' }).catch(() => {});
        }}
        disabled={loading}
      >
        Rename to Ada King
      </button>
      {error ? <p data-testid="mutation-error">{error}</p> : null}
    </div>
  );
}

export default function App() {
  return (
    <div>
      <UserCard testId="user-a" document="GetUser" />
      <UserCard testId="user-a-dup" document="GetUser" />
      <UserCard testId="user-b" document="GetUserWithPosts" />
      <RenameButton />
    </div>
  );
}
