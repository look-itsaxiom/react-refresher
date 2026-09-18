export type Tokens = { accessToken: string; refreshToken: string; expiresAt: number };

export type TokenBroker = {
  exchange(code: string): Promise<Tokens>;
  refresh(refreshToken: string): Promise<Tokens>;
};

export type SessionStore = {
  create(record: Tokens): string;
  get(sessionId: string): Tokens | null;
  update(sessionId: string, record: Tokens): void;
  revoke(sessionId: string): void;
};

export type BffRequest = {
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  cookies?: Record<string, string>;
  secFetchSite?: 'same-origin' | 'same-site' | 'cross-site' | 'none';
};

export type UpstreamResponse = { status: number; body?: unknown };
export type Upstream = (req: { path: string; method: string; headers: Record<string, string>; body?: unknown }) => Promise<UpstreamResponse>;

export type Bff = {
  login(code: string): Promise<{ status: number; setCookie: string }>;
  proxy(request: BffRequest, upstream: Upstream): Promise<UpstreamResponse>;
  logout(request: BffRequest): { status: number; setCookie: string };
};

const SESSION_COOKIE = '__Host-sid';

export function createBff(config: { sessions: SessionStore; tokenBroker: TokenBroker; clock: () => number }): Bff {
  const { sessions, tokenBroker, clock } = config;
  const inFlightRefreshes = new Map<string, Promise<Tokens>>();

  function readSessionId(request: BffRequest): string | undefined {
    return request.cookies?.[SESSION_COOKIE];
  }

  function isCrossSite(request: BffRequest): boolean {
    return request.secFetchSite !== undefined && request.secFetchSite !== 'same-origin' && request.secFetchSite !== 'none';
  }

  return {
    async login(code: string) {
      const tokens = await tokenBroker.exchange(code);
      const sessionId = sessions.create(tokens);
      return { status: 200, setCookie: `${SESSION_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/` };
    },

    async proxy(request: BffRequest, upstream: Upstream): Promise<UpstreamResponse> {
      if (isCrossSite(request)) {
        return { status: 403 };
      }

      const sessionId = readSessionId(request);
      if (!sessionId) {
        return { status: 401 };
      }

      let tokens = sessions.get(sessionId);
      if (!tokens) {
        return { status: 401 };
      }

      if (tokens.expiresAt <= clock()) {
        let refreshPromise = inFlightRefreshes.get(sessionId);
        if (!refreshPromise) {
          refreshPromise = tokenBroker.refresh(tokens.refreshToken);
          inFlightRefreshes.set(sessionId, refreshPromise);
          refreshPromise.finally(() => inFlightRefreshes.delete(sessionId));
        }
        tokens = await refreshPromise;
        sessions.update(sessionId, tokens);
      }

      return upstream({
        path: request.path,
        method: request.method,
        headers: { ...request.headers, Authorization: `Bearer ${tokens.accessToken}` },
        body: request.body,
      });
    },

    logout(request: BffRequest) {
      const sessionId = readSessionId(request);
      if (sessionId) {
        sessions.revoke(sessionId);
      }
      return { status: 200, setCookie: `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0` };
    },
  };
}

export default function App() {
  return (
    <div>
      <p>Open the console/tests to exercise createBff.</p>
    </div>
  );
}
