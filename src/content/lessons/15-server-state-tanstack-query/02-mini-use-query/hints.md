Don't store the fetched value in `useState` inside the hook — that would give every call site its
own private copy again, exactly what you're trying to get away from. Read and write `data` through
the shared `cache` `Map` instead; use a small piece of local state (even just a counter you
increment) purely to force a re-render when the cache changes underneath a mounted component.

---

In the effect, check `cache.get(key)` first. If there's nothing there yet (or it's stale) *and*
no fetch is already in flight for that key, call `fetcher()` and immediately store the resulting
promise on the cache entry — synchronously, in the same effect, before the promise resolves. A
sibling component's effect runs right after yours in the same commit; if it sees your in-flight
promise already sitting in the cache, it should attach its own `.then()` to *that* promise instead
of starting a second `fetcher()` call.

---

Something like:

```ts
type Entry<T> = { data?: T; error: string | null; fetchedAt: number; promise: Promise<T> | null };
const cache = new Map<string, Entry<unknown>>();

function useQuery<T>(key: string, fetcher: () => Promise<T>, options?: { staleTime?: number }) {
  const staleTime = options?.staleTime ?? 0;
  const [, forceRender] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const entry = cache.get(key) as Entry<T> | undefined;
    const isStale = !entry || Date.now() - entry.fetchedAt > staleTime;

    if (isStale && !entry?.promise) {
      const promise = fetcher().then(
        (data) => { cache.set(key, { data, error: null, fetchedAt: Date.now(), promise: null }); return data; },
        (err: Error) => { cache.set(key, { error: err.message, fetchedAt: Date.now(), promise: null }); throw err; },
      );
      cache.set(key, { data: entry?.data, error: null, fetchedAt: entry?.fetchedAt ?? 0, promise });
    }

    cache.get(key)?.promise?.then(
      () => { if (!cancelled) forceRender((n) => n + 1); },
      () => { if (!cancelled) forceRender((n) => n + 1); },
    );

    return () => { cancelled = true; };
  }, [key, staleTime]);

  const entry = cache.get(key) as Entry<T> | undefined;
  return { data: entry?.data ?? null, loading: !entry, error: entry?.error ?? null };
}
```

Notice `loading` is only true when there's *no entry at all* for the key yet — once something is
cached, even a stale something, you show it and refetch quietly.

---

`invalidate(key)` is just `cache.delete(key)` — nothing subscribed to the cache needs to be told
synchronously, because the next component to mount (or the check's next `render`) reads the `Map`
directly and finds it empty, which is exactly what should trigger a fresh fetch.
