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

// --- TODO: build useGraphQL and useMutationGQL on top of `cache` and `transport`. ---
//
// A request-state record, one per (document + variables) key, is the natural place to
// hold what a useGraphQL call needs between renders — sketch:
//
// type RequestRecord = {
//   snapshot: { data: unknown; loading: boolean; error: string | null };
//   root?: Record<string, unknown>;      // last successful normalize()'s root, for re-denormalizing
//   dependsOn: EntityKey[];              // entity keys this query's response touched
//   inFlight: boolean;
//   listeners: Set<() => void>;
// };
// const requests = new Map<string, RequestRecord>();
//
// Subscribing to `cache` once, here at module scope, and re-denormalizing + notifying
// each affected record's listeners when its `dependsOn` overlaps the changed keys, is
// what makes a mutation's cache write reach every mounted useGraphQL call for that
// entity without either side knowing about the other. See hints.md.

function useGraphQL<T = unknown>(
  document: string,
  variables: Record<string, unknown> = {},
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  return { data: null, loading: true, error: null, refetch: () => {} };
}

function useMutationGQL<TVars extends Record<string, unknown> = Record<string, unknown>>(
  document: string,
  options?: {
    optimistic?: (variables: TVars) => Record<string, unknown>;
    update?: (c: Cache, data: Record<string, unknown> | undefined, variables: TVars) => void;
  },
): [(variables: TVars) => Promise<Record<string, unknown> | undefined>, { loading: boolean; error: string | null }] {
  const mutate = useCallback(async (_variables: TVars) => {
    return undefined;
  }, []);
  return [mutate, { loading: false, error: null }];
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
