import { useEffect, useState } from 'react';
import { fetchUser } from '@server/users';

// A tiny module-level cache, shared by every component that calls useQuery — the same idea
// TanStack Query's QueryClient implements at scale, just for one key type here.
export type Entry<T> = { data?: T; error: string | null; fetchedAt: number; promise: Promise<T> | null };
const cache = new Map<string, Entry<unknown>>();

// How many times the "server" has actually been asked for a user. Two components sharing a
// cache and dedupe-ing correctly should only ever bump this once per key.
export const stats = { fetchCount: 0 };

function countedFetchUser(id: number) {
  stats.fetchCount += 1;
  return fetchUser(id);
}

/** Drop a key from the cache so the next read fetches fresh. */
export function invalidate(key: string) {
  cache.delete(key);
}

// TODO: replace this with a real useQuery(key, fetcher, options) built on top of `cache`.
// Right now every component that calls it fetches independently, with the classic bugs:
// - no dedupe: UserA and UserB both mounting fires two identical requests
// - no cache: unmounting and remounting always starts over at `loading: true`
function useUserQuery(id: number) {
  const [state, setState] = useState<{ data: { id: number; name: string } | null; loading: boolean }>({
    data: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, loading: true });
    countedFetchUser(id).then((data) => {
      if (!cancelled) setState({ data, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}

function UserA() {
  const { data, loading } = useUserQuery(1);
  return <p data-testid="user-a">{loading ? 'Loading…' : data!.name}</p>;
}

function UserB() {
  const { data, loading } = useUserQuery(1);
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
