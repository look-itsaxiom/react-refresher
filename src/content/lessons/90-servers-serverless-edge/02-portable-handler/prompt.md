# Build a portable `fetch` handler

Every runtime in the last lesson -- Workers, Deno Deploy, Vercel Functions, and a plain
Node server -- can run the same shape of handler:

```ts
type FetchHandler = (request: Request, env: Env, ctx: Ctx) => Promise<Response>;
```

Implement a tiny router with that shape, plus a Node adapter, so the same app can run on
an edge platform *or* behind `http.createServer`.

## What to build

Fill in `App.tsx`. Everything is exported from that one file; the default `App`
component just renders a short label so the preview shows something.

### Types (already declared for you)

```ts
type Params = Record<string, string>;
type Env = Record<string, string>;
type Ctx = { waitUntil(promise: Promise<unknown>): void };
type RouteHandler = (request: Request, params: Params, env: Env, ctx: Ctx) => Promise<Response> | Response;
type Route = { method: string; path: string; handler: RouteHandler };
type LogEntry = { method: string; path: string; status: number; error?: unknown };
type Logger = (entry: LogEntry) => Promise<void>;
```

### 1. `json(data: unknown, init?: ResponseInit): Response`

A helper that JSON-stringifies `data` and returns a `Response` with
`content-type: application/json` set (merge with any headers in `init`, and let
`init.status` override the default `200`).

### 2. `createApp(routes: Route[], options?: { logger?: Logger }): FetchHandler`

Returns `(request, env, ctx) => Promise<Response>` that:

- Parses `request.url` with `URL` and matches `request.method` + the pathname against
  `routes`. Paths use `:name` segments for params, e.g. `/users/:id` matches
  `/users/42` with `params = { id: '42' }`. Segment counts must match exactly (no
  wildcards, no trailing-slash normalization needed).
- If **no route's path** matches the pathname at all: respond `json({ error: 'not found' }, { status: 404 })`.
- If **some route's path matches but not this method**: respond with status `405`, a
  JSON body `{ error: 'method not allowed' }`, and an `Allow` header whose value is the
  sorted, comma-and-space-joined, de-duplicated list of methods that *do* match that path
  (e.g. `"GET, POST"`).
- If a matching handler throws, or returns a rejected promise: catch it, respond
  `json({ error: message }, { status: 500 })` (use `error instanceof Error ? error.message : String(error)`),
  and call `ctx.waitUntil(logger({ method, path: pathname, status: 500, error }))` --
  **do not `await` the logger call**. The response must be returned to the caller before
  the logger's promise settles, even if the logger is slow.
- If the handler succeeds, return its `Response` as-is. No logging on success.
- `options.logger` defaults to an `async () => {}` no-op when not provided.

### 3. `toNodeHandler(app: FetchHandler, env?: Env): (req: NodeRequest, res: NodeResponse) => Promise<void>`

```ts
type NodeRequest = { method: string; url: string; headers: Record<string, string>; body?: string };
type NodeResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
};
```

Adapts a fake Node-style `(req, res)` pair to `app`:

- Build an absolute `Request` URL from `req.headers.host` (fall back to `'localhost'` if
  missing) and `req.url`, e.g. `http://<host><url>`.
- Only pass `body` to the `Request` when the method isn't `GET` or `HEAD` (the Fetch spec
  forbids a body on those).
- Build a `Ctx` whose `waitUntil` collects the promises it's given, and `await Promise.all(...)`
  them before finishing the response -- a Node process has no platform-managed
  "keep alive after response" behavior, so the adapter has to wait itself.
- Call `app(request, env ?? {}, ctx)`, then copy the resulting `Response`'s `status` into
  `res.statusCode`, copy every header with `res.setHeader`, and call
  `res.end(await response.text())`.

## Files

- `App.tsx` -- everything above, plus a default `App` component rendering any short
  string (e.g. `<p>Portable handler ready</p>`).
