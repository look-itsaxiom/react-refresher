Implement `corsMiddleware(config)` in `App.tsx`: a factory that returns a pure function modeling
the CORS-handling layer of a server (the kind you'd actually write for an Express/Fastify/Hono
app, minus the framework wiring).

```ts
type CorsConfig = {
  allowedOrigins: string[]; // may include the literal '*'
  credentials: boolean;
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  maxAge?: number; // seconds; defaults to 600 if omitted
};

type MiddlewareRequest = {
  method: string;
  origin?: string; // absent when the request isn't cross-origin at all
  headers: Record<string, string>; // for a preflight, includes access-control-request-*
};

type MiddlewareResponse = { status: number; headers: Record<string, string> };

function corsMiddleware(config: CorsConfig): (req: MiddlewareRequest) => MiddlewareResponse | undefined;
```

Behavior:

1. **No `Origin` header at all** → return `undefined`. This isn't a CORS request (same-origin
   call, or a non-browser client); the middleware has nothing to add, so the app's own handler
   runs untouched.

2. **Origin resolution** — an origin is "allowed" if `config.allowedOrigins` contains it exactly,
   *or* `config.allowedOrigins` contains the literal `'*'` and `config.credentials` is `false`
   (a wildcard is never valid alongside credentials, per the response-phase rule from the
   previous exercise). When allowed and the match came from an exact entry (not the wildcard),
   the response must echo back the literal origin the request sent — reflecting an allowlisted
   value is fine; blindly reflecting *any* origin is the vulnerability lesson 65's concept steps
   warn about. When the match is the wildcard case, respond with `*` for
   `Access-Control-Allow-Origin` instead of echoing.

3. **Disallowed origin** (cross-origin request, but not on the allowlist) → return `undefined`
   for both preflight and actual requests. No CORS headers are added; the browser will block the
   read (or the preflight) on the client side, exactly as if this middleware weren't CORS-aware
   at all.

4. **Preflight request** — `req.method === 'OPTIONS'` *and*
   `'access-control-request-method' in req.headers` (a bare `OPTIONS` with neither header is
   not a CORS preflight, and should still return `undefined`). When the origin is allowed,
   return:
   - `status: 204`
   - `Access-Control-Allow-Origin` (per rule 2)
   - `Access-Control-Allow-Methods`: `config.allowedMethods.join(', ')`
   - `Access-Control-Allow-Headers`: `config.allowedHeaders.join(', ')`
   - `Access-Control-Max-Age`: `String(config.maxAge ?? 600)`
   - `Vary: 'Origin'`
   - `Access-Control-Allow-Credentials: 'true'`, only if `config.credentials` is `true`
   - Do **not** include `Access-Control-Expose-Headers` here — that header only matters for the
     actual response, never the preflight.

5. **Actual (non-preflight) cross-origin request** — when the origin is allowed, return:
   - `status: 200`
   - `Access-Control-Allow-Origin` (per rule 2)
   - `Vary: 'Origin'`
   - `Access-Control-Allow-Credentials: 'true'`, only if `config.credentials` is `true`
   - `Access-Control-Expose-Headers`: `config.exposedHeaders!.join(', ')`, only if
     `config.exposedHeaders` is non-empty
   - Do **not** include `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, or
     `Access-Control-Max-Age` here — those are preflight-only headers.

`App.tsx` renders the middleware's response for a small fixed set of example requests against
one example config — extend the fixtures if you like, but keep the render so the preview shows
something.
