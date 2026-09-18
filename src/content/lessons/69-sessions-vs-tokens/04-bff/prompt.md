# Model the token handler

`App.tsx` implements `createBff(config)` — a simplified but faithful model of the token
handler pattern from the concept step: a server component that holds real tokens, hands
the browser only a session cookie, and proxies API calls with the token attached.

```ts
type Tokens = { accessToken: string; refreshToken: string; expiresAt: number }; // expiresAt: ms epoch

type TokenBroker = {
  exchange(code: string): Promise<Tokens>; // trade an OAuth code for tokens
  refresh(refreshToken: string): Promise<Tokens>; // trade a refresh token for new tokens
};

// Provided for you -- store real tokens keyed by an opaque session id.
type SessionStore = {
  create(record: Tokens): string; // returns a new session id
  get(sessionId: string): Tokens | null;
  update(sessionId: string, record: Tokens): void;
  revoke(sessionId: string): void;
};

type BffRequest = {
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  cookies?: Record<string, string>; // e.g. { '__Host-sid': 'abc' }
  secFetchSite?: 'same-origin' | 'same-site' | 'cross-site' | 'none'; // Sec-Fetch-Site, when the browser sent one
};

type UpstreamResponse = { status: number; body?: unknown };
type Upstream = (req: { path: string; method: string; headers: Record<string, string>; body?: unknown }) => Promise<UpstreamResponse>;

type Bff = {
  login(code: string): Promise<{ status: number; setCookie: string }>;
  proxy(request: BffRequest, upstream: Upstream): Promise<UpstreamResponse>;
  logout(request: BffRequest): { status: number; setCookie: string };
};

function createBff(config: { sessions: SessionStore; tokenBroker: TokenBroker; clock: () => number }): Bff;
```

## `login(code)`

Exchange `code` via `config.tokenBroker.exchange(code)`, store the resulting tokens with
`config.sessions.create(...)`, and return `{ status: 200, setCookie: "__Host-sid=<id>;
HttpOnly; Secure; SameSite=Lax; Path=/" }` using the id you got back.

## `proxy(request, upstream)`

1. If `request.secFetchSite` is present and is neither `'same-origin'` nor `'none'`,
   return `{ status: 403 }` immediately — this is the Fetch Metadata check from the
   concept step, and it happens before you even look at the cookie.
2. Read the session id from `request.cookies?.['__Host-sid']`. If it's missing, or
   `config.sessions.get(sessionId)` returns `null`, return `{ status: 401 }`.
3. If the stored tokens are expired (`tokens.expiresAt <= config.clock()`), refresh them
   via `config.tokenBroker.refresh(tokens.refreshToken)` and `config.sessions.update(...)`
   the session with the result before continuing. **Two concurrent `proxy` calls that
   both see an expired token for the same session must trigger exactly one call to
   `refresh`** — the second call should wait for and reuse the first call's in-flight
   refresh, not start its own.
4. Call `upstream(...)` with the original `path`/`method`/`body`, headers spread from
   `request.headers`, plus `Authorization: Bearer <accessToken>` added (using whatever
   the (possibly just-refreshed) access token is), and return whatever `upstream` returns.

## `logout(request)`

Read the session id the same way; if present, `config.sessions.revoke(sessionId)`.
Return `{ status: 200, setCookie: "__Host-sid=; HttpOnly; Secure; SameSite=Lax; Path=/;
Max-Age=0" }` either way (an already-logged-out request should still get a clearing
cookie back, harmlessly).

## Why this matters

This is the entire "browser never sees a token" property from the concept step, made
concrete: the only thing that ever crosses into client-visible territory is an opaque
session id in an `HttpOnly` cookie. Everything that can act as the user's real
credential — the access token, the refresh token — stays on one side of the proxy call.
