# Build an ISR cache: stale-while-revalidate for rendered pages

Implement `createIsrCache`, a minimal model of what a framework's ISR layer
does: serve a cached render immediately, and only pay the cost of
re-rendering when the cached copy has expired — and even then, without
making the visitor who triggered it wait.

```ts
type Render = (key: string) => Promise<string>;
type Clock = () => number; // returns "now" in milliseconds

function createIsrCache(options: { revalidateSeconds: number; clock: Clock }): {
  get(key: string, render: Render): Promise<string>;
  invalidate(key: string): void;
};
```

`clock` stands in for `Date.now` — tests will pass a fake one so they don't
depend on real time. `render(key)` stands in for actually rendering the
page for that key; treat it as expensive and assume it may be slow.

## `get(key, render)`

1. **Cold miss** (nothing cached for `key`): call `render(key)`, wait for
   it, cache the result along with the time it was produced, and return
   it.
2. **Fresh hit**: if the cached entry is younger than `revalidateSeconds`
   (compare `clock() - renderedAt` against `revalidateSeconds * 1000`),
   return the cached HTML immediately. Do not call `render`.
3. **Stale hit**: if the cached entry has expired, **return the stale
   cached HTML immediately** — don't make this call wait on a re-render —
   and separately kick off a background call to `render(key)` that
   updates the cache when it finishes. This is the "stale-while-revalidate"
   behavior: the visitor who happens to trigger the revalidation still gets
   a fast response; the *next* visitor after the background render
   finishes gets the fresh copy.
4. **Dedupe concurrent revalidations**: if a background revalidation for
   `key` is already in flight when another stale hit comes in for the same
   key, don't start a second `render` call — let the one in flight finish
   and update the cache once.

## `invalidate(key)`

Clears the cached entry for `key` immediately (on-demand revalidation —
what a CMS webhook triggers). The next `get` call for that key behaves like
a cold miss: it blocks on a fresh `render` call, because there's no stale
copy left to serve in the meantime.

The default export is a small demo: a button that calls `get('/home', ...)`
against a cache with a 5-second window and logs each result, so you can see
a render actually happening (open the console/log list and click it a few
times within and across the 5-second window).
