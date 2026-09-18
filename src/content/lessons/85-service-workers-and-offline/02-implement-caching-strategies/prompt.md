# Implement the caching strategies

A real service worker can't import `caches` or `fetch` a real network in
this sandbox, so `App.tsx` ships a tiny fake runtime that mirrors the real
shapes: `FakeCache` (`match`, `put`, `keys`, `delete`), `FakeCacheStorage`
(`open`, `keys`, `delete`), and a `StrategyCtx` your strategies receive
instead of the global `caches` and `fetch`.

A strategy has this shape, matching Workbox's handler signature minus the
service worker global scope:

```ts
type Strategy = (request: Request, ctx: StrategyCtx) => Promise<Response>;

type StrategyCtx = {
  caches: FakeCacheStorage;
  fetch: (request: Request) => Promise<Response>;
  cacheName: string;
  /** Registers a promise the caller can await before asserting on background work. */
  waitUntil: (promise: Promise<unknown>) => void;
};
```

Implement three strategies. All three must open the cache with
`ctx.caches.open(ctx.cacheName)`, and none may ever store a response whose
`.ok` is `false`. Whenever you store a response, `.clone()` it first — the
one you return to the caller must still have a readable body.

1. **`cacheFirst(request, ctx)`** — return a cached match if one exists.
   Otherwise fetch from the network, cache the result (if `ok`), and return
   it.

2. **`networkFirst({ timeoutMs })`** — a function that *returns* a
   `Strategy`. Race the network fetch against a `timeoutMs` timer. If the
   network responds in time and is `ok`, cache it and return it. If the
   network throws (offline) or the timer wins the race, fall back to
   whatever is cached for this request.

3. **`staleWhileRevalidate(request, ctx)`** — if a cached response exists,
   return it **immediately**, without waiting on the network at all. Start
   a network fetch in the background, register that fetch's promise with
   `ctx.waitUntil(...)` so callers can wait for it to finish, and update the
   cache from it once it resolves (if `ok`). If nothing is cached yet, you
   have no stale response to return — wait for the network fetch and return
   that instead (still updating the cache and calling `waitUntil`).

All three are exported from `App.tsx` already wired to a small demo
component; you're only filling in the three function bodies.
