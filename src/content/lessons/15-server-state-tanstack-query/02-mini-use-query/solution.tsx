import { useEffect, useState } from 'react';
import { fetchUser } from '@server/users';

export type Entry<T> = { data?: T; error: string | null; fetchedAt: number; promise: Promise<T> | null };
const cache = new Map<string, Entry<unknown>>();

export const stats = { fetchCount: 0 };

function countedFetchUser(id: number) {
  stats.fetchCount += 1;
  return fetchUser(id);
}

export function invalidate(key: string) {
  cache.delete(key);
}

function useQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { staleTime?: number },
): { data: T | null; loading: boolean; error: string | null } {
  const staleTime = options?.staleTime ?? 0;
  const [, forceRender] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const entry = cache.get(key) as Entry<T> | undefined;
    const isStale = !entry || Date.now() - entry.fetchedAt > staleTime;

    if (isStale && !entry?.promise) {
      // Nobody is fetching this key yet. Kick off the fetch and publish the promise onto the
      // cache immediately (synchronously, before it resolves) so a sibling's effect — which
      // runs right after this one in the same commit — sees it and dedupes instead of fetching.
      const promise = fetcher().then(
        (data) => {
          cache.set(key, { data, error: null, fetchedAt: Date.now(), promise: null });
          return data;
        },
        (err: Error) => {
          cache.set(key, { error: err.message, fetchedAt: Date.now(), promise: null });
          throw err;
        },
      );
      cache.set(key, { data: entry?.data, error: null, fetchedAt: entry?.fetchedAt ?? 0, promise });
    }

    // Whether this call started the fetch or found one already in flight, ride the same promise
    // so this component re-renders once it settles.
    cache.get(key)?.promise?.then(
      () => {
        if (!cancelled) forceRender((n) => n + 1);
      },
      () => {
        if (!cancelled) forceRender((n) => n + 1);
      },
    );

    return () => {
      cancelled = true;
    };
    // key/staleTime fully describe what this effect depends on; `fetcher` identities are expected
    // to change every render (an inline closure) and are intentionally not part of this contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, staleTime]);

  const entry = cache.get(key) as Entry<T> | undefined;
  return { data: entry?.data ?? null, loading: !entry, error: entry?.error ?? null };
}

function UserA() {
  const { data, loading } = useQuery('user:1', () => countedFetchUser(1), { staleTime: 50 });
  return <p data-testid="user-a">{loading ? 'Loading…' : data!.name}</p>;
}

function UserB() {
  const { data, loading } = useQuery('user:1', () => countedFetchUser(1), { staleTime: 50 });
  return <p data-testid="user-b">{loading ? 'Loading…' : data!.name}</p>;
}

export default function App() {
  return (
    <div>
      <UserA />
      <UserB />
    </div>
  );
}
