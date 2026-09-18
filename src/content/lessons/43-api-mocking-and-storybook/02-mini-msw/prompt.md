Implement a miniature version of MSW's request-matching core: `http` handler builders and
`setupMock`, which routes a real `Request` to the first matching handler's resolver.

```ts
type Resolver = (info: { request: Request; params: Record<string, string> }) =>
  Response | undefined | Promise<Response | undefined>;

type RequestHandler = { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; pathPattern: string; resolver: Resolver; once?: boolean };

const http: {
  get(pathPattern: string, resolver: Resolver, options?: { once?: boolean }): RequestHandler;
  post(...): RequestHandler;
  put(...): RequestHandler;
  delete(...): RequestHandler;
};

function setupMock(initialHandlers: RequestHandler[], options?: { onUnhandledRequest?: 'error' | 'bypass' }): {
  handle(request: Request): Promise<Response | undefined>;
  use(...handlers: RequestHandler[]): void;
  resetHandlers(): void;
};
```

1. **Path matching.** `pathPattern` segments starting with `:` capture that segment into `params`
   (`/api/users/:id` matches `/api/users/42` with `params.id === '42'`); a segment that is exactly
   `*` matches the rest of the path, however many segments remain. Query strings and the origin
   don't affect matching — only method and pathname.
2. **First match wins, in order.** `handle()` tries handlers in the order they're registered
   (handlers added via `use()` first, then the initial list), calling the first one whose method
   and path both match. If that resolver returns `undefined` — a deliberate passthrough — keep
   going to the next matching handler instead of stopping.
3. **`once` handlers are single-shot.** A handler created with `{ once: true }` is removed from
   the active set right after it produces a response (a resolver return of `undefined` does not
   count as "produced a response" — a passthrough handler with `once` should NOT be consumed).
4. **`use()` and `resetHandlers()`.** `use(...handlers)` adds runtime handlers that take priority
   over the initial ones (checked first), for the rest of the test. `resetHandlers()` discards
   those runtime handlers and restores every initial handler to its original, unconsumed state —
   including `once` handlers that had already fired.
5. **Unhandled requests.** If nothing matches (or everything that matched passed through),
   `onUnhandledRequest: 'error'` should throw; the default (`'bypass'`, or no option) resolves
   `undefined`.

A `json(body, init?)` helper is provided (a small `HttpResponse.json` stand-in) — use it, or the
plain `Response` constructor, from your resolvers. Don't change `json`. `App.tsx` wires `http` and
`setupMock` to a button that fetches a mocked user; make it work once your implementation is
correct.
