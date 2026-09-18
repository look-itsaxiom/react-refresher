Start with `cacheFirst` — it's the shortest. `await ctx.caches.open(ctx.cacheName)`
gives you a `FakeCache`. `await cache.match(request)` returns `undefined` on
a miss. On a miss, `await ctx.fetch(request)`, check `.ok`, and
`await cache.put(request, response.clone())` before returning `response`
(not the clone — the clone goes to the cache, the original goes to the
caller).

---

For `networkFirst`, remember it's a *factory*: the exported binding is a
function that takes `{ timeoutMs }` and returns the actual `Strategy`
function, so your `export function networkFirst(...)` body should
`return async (request, ctx) => { ... }`. Build a timeout promise with
`new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))`
and `Promise.race([ctx.fetch(request), thatTimeoutPromise])` inside a
`try`. In the `catch`, fall back to `cache.match(request)`.

---

For `staleWhileRevalidate`, look up the cache first and hold onto the
result before doing anything async with the network. Build the network
`Promise` (the `.then(...)` chain that puts into the cache) but don't
`await` it inline — pass that same promise (or a `.catch(() => {})`-guarded
version of it, so a failed background fetch doesn't produce an unhandled
rejection) to `ctx.waitUntil(...)`. Only `await` the network promise
yourself in the branch where there was no cached response to return.

---

If a check complains the returned response's body isn't readable, you
likely stored the exact object you're about to return, instead of a
`.clone()` of it — every `cache.put(...)` call should be
`cache.put(request, response.clone())`, never `cache.put(request, response)`.
