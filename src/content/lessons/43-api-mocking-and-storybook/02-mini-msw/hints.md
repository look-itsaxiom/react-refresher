Write a `matchPath(pathPattern, pathname)` helper that splits both strings on `/` (filtering out
empty segments from leading/trailing slashes). Walk the pattern segments: a `:name` segment
captures the path segment at that position into `params`; a `*` segment means "match everything
from here on," so return immediately (don't check remaining path segments count); any other
segment must equal the path segment at that position exactly, or the whole pattern fails to match.
If you reach the end of the pattern without hitting `*`, the path must have exactly the same number
of segments left, or it's not a match either.

---

Keep two arrays inside `setupMock`'s closure: `runtimeHandlers` (starts empty, replaced by `use()`)
and `baseHandlers` (starts as a *copy* of `initialHandlers` — copy the array, and copy each handler
object, so a later `resetHandlers()` can hand back fresh, unconsumed objects without needing to
remember which ones were spliced out). `handle()` tries `runtimeHandlers` first, then
`baseHandlers`, each in registration order, returning as soon as a resolver produces a non-`undefined`
response. `use(...handlers)` should prepend, not append — `runtimeHandlers = [...handlers,
...runtimeHandlers]` — so the most recently added override wins.

---

The "once" and "passthrough don't count as consumed" rules only apply to the handler that actually
produced the response — check `handler.once` *after* confirming `result !== undefined`, and splice
that specific handler out of whichever list (`runtimeHandlers` or `baseHandlers`) you're currently
iterating (`list.indexOf(handler)`, then `list.splice(index, 1)`), not out of a hardcoded array.

---

Full shape for the matching loop inside `handle()`:

```ts
async function tryList(list: RequestHandler[], request: Request, url: URL) {
  for (const handler of list) {
    if (handler.method !== request.method) continue;
    const params = matchPath(handler.pathPattern, url.pathname);
    if (!params) continue;
    const result = await handler.resolver({ request, params });
    if (result === undefined) continue;
    if (handler.once) {
      const index = list.indexOf(handler);
      if (index !== -1) list.splice(index, 1);
    }
    return result;
  }
  return undefined;
}
```

Call `tryList(runtimeHandlers, ...)` then `tryList(baseHandlers, ...)` from `handle()`; if both come
back `undefined`, that's when `onUnhandledRequest === 'error'` should throw.
