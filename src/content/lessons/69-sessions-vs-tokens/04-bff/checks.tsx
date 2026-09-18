import type { Check } from '../../../types';

type Tokens = { accessToken: string; refreshToken: string; expiresAt: number };
type TokenBroker = { exchange(code: string): Promise<Tokens>; refresh(refreshToken: string): Promise<Tokens> };
type SessionStore = {
  create(record: Tokens): string;
  get(sessionId: string): Tokens | null;
  update(sessionId: string, record: Tokens): void;
  revoke(sessionId: string): void;
};
type BffRequest = {
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  cookies?: Record<string, string>;
  secFetchSite?: 'same-origin' | 'same-site' | 'cross-site' | 'none';
};
type UpstreamResponse = { status: number; body?: unknown };
type Upstream = (req: { path: string; method: string; headers: Record<string, string>; body?: unknown }) => Promise<UpstreamResponse>;
type Bff = {
  login(code: string): Promise<{ status: number; setCookie: string }>;
  proxy(request: BffRequest, upstream: Upstream): Promise<UpstreamResponse>;
  logout(request: BffRequest): { status: number; setCookie: string };
};
type Mod = { createBff: (config: { sessions: SessionStore; tokenBroker: TokenBroker; clock: () => number }) => Bff };

function fakeSessions() {
  const store = new Map<string, Tokens>();
  let nextId = 0;
  const calls = { revoke: 0 };
  const sessions: SessionStore = {
    create(record) {
      const id = `sid-${++nextId}`;
      store.set(id, record);
      return id;
    },
    get(sessionId) {
      return store.get(sessionId) ?? null;
    },
    update(sessionId, record) {
      store.set(sessionId, record);
    },
    revoke(sessionId) {
      calls.revoke++;
      store.delete(sessionId);
    },
  };
  return { sessions, store, calls };
}

function fakeClock(startMs = 0) {
  let now = startMs;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

export const checks: Check[] = [
  {
    name: 'login exchanges the code, stores the tokens under a new session, and returns the __Host-sid cookie',
    run: async ({ mod, expect }) => {
      const { createBff } = mod as unknown as Mod;
      const { sessions, store } = fakeSessions();
      const clock = fakeClock();
      const tokenBroker: TokenBroker = {
        exchange: async (code) => {
          expect(code).to.equal('auth-code-1');
          return { accessToken: 'at-1', refreshToken: 'rt-1', expiresAt: 1000 };
        },
        refresh: async () => {
          throw new Error('refresh should not be called during login');
        },
      };
      const bff = createBff({ sessions, tokenBroker, clock: clock.now });
      const result = await bff.login('auth-code-1');
      expect(result.status).to.equal(200);
      expect(result.setCookie).to.equal('__Host-sid=sid-1; HttpOnly; Secure; SameSite=Lax; Path=/');
      expect(store.get('sid-1')).to.deep.equal({ accessToken: 'at-1', refreshToken: 'rt-1', expiresAt: 1000 });
    },
  },
  {
    name: 'proxy rejects a cross-site request with 403 before ever calling upstream',
    run: async ({ mod, expect }) => {
      const { createBff } = mod as unknown as Mod;
      const { sessions } = fakeSessions();
      const clock = fakeClock();
      const tokenBroker: TokenBroker = { exchange: async () => { throw new Error('unused'); }, refresh: async () => { throw new Error('unused'); } };
      const bff = createBff({ sessions, tokenBroker, clock: clock.now });
      let upstreamCalls = 0;
      const upstream: Upstream = async () => {
        upstreamCalls++;
        return { status: 200 };
      };
      const result = await bff.proxy({ path: '/api/me', method: 'GET', cookies: { '__Host-sid': 'sid-1' }, secFetchSite: 'cross-site' }, upstream);
      expect(result.status).to.equal(403);
      expect(upstreamCalls, 'upstream must not be called for a rejected cross-site request').to.equal(0);
    },
  },
  {
    name: 'proxy allows same-origin and none, and returns 401 with no session cookie',
    run: async ({ mod, expect }) => {
      const { createBff } = mod as unknown as Mod;
      const { sessions } = fakeSessions();
      const clock = fakeClock();
      const tokenBroker: TokenBroker = { exchange: async () => { throw new Error('unused'); }, refresh: async () => { throw new Error('unused'); } };
      const bff = createBff({ sessions, tokenBroker, clock: clock.now });
      const upstream: Upstream = async () => ({ status: 200 });
      const noCookie = await bff.proxy({ path: '/api/me', method: 'GET', secFetchSite: 'same-origin' }, upstream);
      expect(noCookie.status).to.equal(401);
      const unknownSession = await bff.proxy({ path: '/api/me', method: 'GET', cookies: { '__Host-sid': 'ghost' }, secFetchSite: 'none' }, upstream);
      expect(unknownSession.status).to.equal(401);
    },
  },
  {
    name: 'proxy forwards the request to upstream with a Bearer Authorization header from the stored access token',
    run: async ({ mod, expect }) => {
      const { createBff } = mod as unknown as Mod;
      const { sessions } = fakeSessions();
      sessions.create({ accessToken: 'at-valid', refreshToken: 'rt-valid', expiresAt: 1000 });
      const clock = fakeClock(500); // well before expiresAt
      const tokenBroker: TokenBroker = { exchange: async () => { throw new Error('unused'); }, refresh: async () => { throw new Error('refresh must not run for a non-expired token'); } };
      const bff = createBff({ sessions, tokenBroker, clock: clock.now });
      let received: Parameters<Upstream>[0] | null = null;
      const upstream: Upstream = async (req) => {
        received = req;
        return { status: 200, body: { ok: true } };
      };
      const result = await bff.proxy(
        { path: '/api/orders', method: 'POST', body: { id: 1 }, headers: { 'x-trace': 'abc' }, cookies: { '__Host-sid': 'sid-1' }, secFetchSite: 'same-origin' },
        upstream,
      );
      expect(result).to.deep.equal({ status: 200, body: { ok: true } });
      expect(received).to.not.equal(null);
      expect(received!.headers['Authorization']).to.equal('Bearer at-valid');
      expect(received!.headers['x-trace']).to.equal('abc');
      expect(received!.path).to.equal('/api/orders');
      expect(received!.method).to.equal('POST');
      expect(received!.body).to.deep.equal({ id: 1 });
    },
  },
  {
    name: 'proxy refreshes an expired token and forwards with the new access token',
    run: async ({ mod, expect }) => {
      const { createBff } = mod as unknown as Mod;
      const { sessions, store } = fakeSessions();
      sessions.create({ accessToken: 'at-old', refreshToken: 'rt-1', expiresAt: 100 });
      const clock = fakeClock(200); // already past expiresAt
      let refreshCalls = 0;
      const tokenBroker: TokenBroker = {
        exchange: async () => { throw new Error('unused'); },
        refresh: async (refreshToken) => {
          refreshCalls++;
          expect(refreshToken).to.equal('rt-1');
          return { accessToken: 'at-new', refreshToken: 'rt-2', expiresAt: 900 };
        },
      };
      const bff = createBff({ sessions, tokenBroker, clock: clock.now });
      const upstream: Upstream = async (req) => ({ status: 200, body: req.headers['Authorization'] });
      const result = await bff.proxy({ path: '/api/me', method: 'GET', cookies: { '__Host-sid': 'sid-1' } }, upstream);
      expect(refreshCalls).to.equal(1);
      expect(result.body).to.equal('Bearer at-new');
      expect(store.get('sid-1')).to.deep.equal({ accessToken: 'at-new', refreshToken: 'rt-2', expiresAt: 900 });
    },
  },
  {
    name: 'two concurrent proxy calls on the same expired session trigger exactly one refresh',
    run: async ({ mod, expect }) => {
      const { createBff } = mod as unknown as Mod;
      const { sessions } = fakeSessions();
      sessions.create({ accessToken: 'at-old', refreshToken: 'rt-1', expiresAt: 100 });
      const clock = fakeClock(200);
      let refreshCalls = 0;
      const tokenBroker: TokenBroker = {
        exchange: async () => { throw new Error('unused'); },
        refresh: async () => {
          refreshCalls++;
          await new Promise((resolve) => setTimeout(resolve, 5));
          return { accessToken: 'at-new', refreshToken: 'rt-2', expiresAt: 900 };
        },
      };
      const bff = createBff({ sessions, tokenBroker, clock: clock.now });
      const upstream: Upstream = async (req) => ({ status: 200, body: req.headers['Authorization'] });
      const request: BffRequest = { path: '/api/me', method: 'GET', cookies: { '__Host-sid': 'sid-1' } };
      const [a, b] = await Promise.all([bff.proxy(request, upstream), bff.proxy(request, upstream)]);
      expect(refreshCalls, 'a concurrent burst against the same expired session should refresh exactly once').to.equal(1);
      expect(a.body).to.equal('Bearer at-new');
      expect(b.body).to.equal('Bearer at-new');
    },
  },
  {
    name: 'logout revokes the session and returns a clearing cookie; a request with no session also gets one back',
    run: async ({ mod, expect }) => {
      const { createBff } = mod as unknown as Mod;
      const { sessions, calls } = fakeSessions();
      sessions.create({ accessToken: 'at-1', refreshToken: 'rt-1', expiresAt: 1000 });
      const clock = fakeClock();
      const tokenBroker: TokenBroker = { exchange: async () => { throw new Error('unused'); }, refresh: async () => { throw new Error('unused'); } };
      const bff = createBff({ sessions, tokenBroker, clock: clock.now });

      const result = bff.logout({ path: '/logout', method: 'POST', cookies: { '__Host-sid': 'sid-1' } });
      expect(result.status).to.equal(200);
      expect(result.setCookie).to.equal('__Host-sid=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
      expect(calls.revoke, 'logout with a real session must revoke it').to.equal(1);

      const noSessionResult = bff.logout({ path: '/logout', method: 'POST' });
      expect(noSessionResult.status).to.equal(200);
      expect(calls.revoke, 'logout with no session cookie must not call revoke again').to.equal(1);
    },
  },
];
