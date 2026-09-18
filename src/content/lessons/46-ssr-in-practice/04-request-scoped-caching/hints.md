`createRequestCache` doesn't need any global or shared state at all -- each call to `run(fn)` should create a brand-new `Map<string, Promise<unknown>>` local to that call, and pass a `memo` closure that reads and writes only that Map. Because it's a fresh Map per call, two concurrent `run`s can never see each other's entries no matter what keys they use.

---

`memo(key, loader)` should check `map.has(key)` first. If it's missing, call `loader()` (don't `await` it yet -- store the *promise* in the map immediately) and set it before returning. That way two `memo` calls for the same key made back-to-back (before the first one resolves) both see the same promise already in the map, not just the same resolved value -- which is what makes concurrent dedup work, not just sequential dedup.

---

For `withCacheControl`, build the directive list as an array you `.join(', ')`: start with `options.public ? 'public' : 'private'`, push `` `max-age=${options.maxAge}` ``, and conditionally push `` `stale-while-revalidate=${options.swr}` `` only `if (options.swr !== undefined)`. Assign the joined string to `response.headers['Cache-Control']`, and if `options.vary?.length`, assign `response.headers['Vary'] = options.vary.join(', ')`. Return `response`.
