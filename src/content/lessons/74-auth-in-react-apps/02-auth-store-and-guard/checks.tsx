import type { ReactNode } from 'react';
import type { Check } from '../../../types';

type Session = { userId: string; roles: string[] } | null;
type AuthState = { status: 'unknown' | 'anonymous' | 'authenticated'; session: Session };
type Api = {
  me(): Promise<Session>;
  login(creds: { username: string; password: string }): Promise<Session>;
  fetch(path: string): Promise<{ status: number; body: string }>;
  refresh(): Promise<Session>;
};
type Channel = { postMessage(data: unknown): void; onmessage: ((ev: { data: unknown }) => void) | null };
type AuthStore = {
  subscribe(cb: () => void): () => void;
  getSnapshot(): AuthState;
  bootstrap(): Promise<void>;
  login(creds: { username: string; password: string }): Promise<void>;
  logout(): void;
  fetchWithAuth(path: string): Promise<{ status: number; body: string }>;
};

type Mod = {
  createAuthStore: (api: Api, channel: Channel) => AuthStore;
  RequireAuth: (props: { store: AuthStore; roles?: string[]; children: ReactNode }) => ReactNode;
  FakeChannel: new (name: string) => Channel;
};

const neverSession: Session = { userId: 'u1', roles: ['member'] };

export const checks: Check[] = [
  {
    name: 'RequireAuth: shows a loading state while unknown, then children once bootstrap resolves',
    run: async ({ mod, render, screen, act, expect }) => {
      const { createAuthStore, RequireAuth, FakeChannel } = mod as unknown as Mod;
      let resolveMe!: (s: Session) => void;
      const api: Api = {
        me: () => new Promise((resolve) => { resolveMe = resolve; }),
        login: async () => neverSession,
        fetch: async () => ({ status: 200, body: 'ok' }),
        refresh: async () => neverSession,
      };
      const store = createAuthStore(api, new FakeChannel('bootstrap-room'));
      render(
        <RequireAuth store={store}>
          <p>Secret content</p>
        </RequireAuth>,
      );
      expect(screen.getByText(/loading/i)).to.exist;
      expect(screen.queryByText('Secret content')).to.equal(null);

      await act(async () => {
        const pending = store.bootstrap();
        resolveMe(neverSession);
        await pending;
      });

      expect(await screen.findByText('Secret content')).to.exist;
    },
  },
  {
    name: 'RequireAuth: redirects an anonymous session to /login',
    run: async ({ mod, render, screen, act, expect }) => {
      const { createAuthStore, RequireAuth, FakeChannel } = mod as unknown as Mod;
      const api: Api = {
        me: async () => null,
        login: async () => null,
        fetch: async () => ({ status: 200, body: 'ok' }),
        refresh: async () => null,
      };
      const store = createAuthStore(api, new FakeChannel('anon-room'));
      await act(async () => {
        await store.bootstrap();
      });
      render(
        <RequireAuth store={store}>
          <p>Secret content</p>
        </RequireAuth>,
      );
      expect(await screen.findByText(/Redirected to \/login/)).to.exist;
      expect(screen.queryByText('Secret content')).to.equal(null);
    },
  },
  {
    name: 'RequireAuth: an authenticated session missing every required role sees Forbidden',
    run: async ({ mod, render, screen, act, expect }) => {
      const { createAuthStore, RequireAuth, FakeChannel } = mod as unknown as Mod;
      const api: Api = {
        me: async () => ({ userId: 'u1', roles: ['member'] }),
        login: async () => neverSession,
        fetch: async () => ({ status: 200, body: 'ok' }),
        refresh: async () => neverSession,
      };
      const store = createAuthStore(api, new FakeChannel('forbidden-room'));
      await act(async () => {
        await store.bootstrap();
      });
      render(
        <RequireAuth store={store} roles={['admin']}>
          <p>Secret content</p>
        </RequireAuth>,
      );
      expect(await screen.findByText(/forbidden/i)).to.exist;
      expect(screen.queryByText('Secret content')).to.equal(null);
    },
  },
  {
    name: 'RequireAuth: an authenticated session with a matching role sees the children',
    run: async ({ mod, render, screen, act, expect }) => {
      const { createAuthStore, RequireAuth, FakeChannel } = mod as unknown as Mod;
      const api: Api = {
        me: async () => ({ userId: 'u1', roles: ['member', 'billing'] }),
        login: async () => neverSession,
        fetch: async () => ({ status: 200, body: 'ok' }),
        refresh: async () => neverSession,
      };
      const store = createAuthStore(api, new FakeChannel('allowed-room'));
      await act(async () => {
        await store.bootstrap();
      });
      render(
        <RequireAuth store={store} roles={['admin', 'billing']}>
          <p>Secret content</p>
        </RequireAuth>,
      );
      expect(await screen.findByText('Secret content')).to.exist;
    },
  },
  {
    name: 'fetchWithAuth: a 401 triggers exactly one refresh, then a successful retry',
    run: async ({ mod, expect }) => {
      const { createAuthStore, FakeChannel } = mod as unknown as Mod;
      let fetchCalls = 0;
      let refreshCalls = 0;
      const api: Api = {
        me: async () => null,
        login: async () => null,
        fetch: async () => {
          fetchCalls += 1;
          return fetchCalls === 1 ? { status: 401, body: 'unauthorized' } : { status: 200, body: 'ok' };
        },
        refresh: async () => {
          refreshCalls += 1;
          return { userId: 'u1', roles: ['member'] };
        },
      };
      const store = createAuthStore(api, new FakeChannel('refresh-room'));
      const result = await store.fetchWithAuth('/data');
      expect(result.status).to.equal(200);
      expect(refreshCalls, 'expected exactly one refresh call').to.equal(1);
      expect(fetchCalls, 'expected the initial 401 call plus one retry').to.equal(2);
      expect(store.getSnapshot().status).to.equal('authenticated');
    },
  },
  {
    name: 'fetchWithAuth: two concurrent 401s dedupe to a single refresh call',
    run: async ({ mod, sleep, expect }) => {
      const { createAuthStore, FakeChannel } = mod as unknown as Mod;
      let fetchCalls = 0;
      let refreshCalls = 0;
      const api: Api = {
        me: async () => null,
        login: async () => null,
        fetch: async () => {
          fetchCalls += 1;
          return fetchCalls <= 2 ? { status: 401, body: 'unauthorized' } : { status: 200, body: 'ok' };
        },
        refresh: async () => {
          refreshCalls += 1;
          await sleep(10);
          return { userId: 'u1', roles: ['member'] };
        },
      };
      const store = createAuthStore(api, new FakeChannel('dedupe-room'));
      const [a, b] = await Promise.all([store.fetchWithAuth('/a'), store.fetchWithAuth('/b')]);
      expect(a.status).to.equal(200);
      expect(b.status).to.equal(200);
      expect(refreshCalls, 'concurrent 401s must share a single refresh').to.equal(1);
    },
  },
  {
    name: 'cross-tab logout: a logout message from another tab flips the store and the guard redirects',
    run: async ({ mod, render, screen, act, expect }) => {
      const { createAuthStore, RequireAuth, FakeChannel } = mod as unknown as Mod;
      const api: Api = {
        me: async () => ({ userId: 'u1', roles: ['member'] }),
        login: async () => neverSession,
        fetch: async () => ({ status: 200, body: 'ok' }),
        refresh: async () => neverSession,
      };
      const store = createAuthStore(api, new FakeChannel('cross-tab-room'));
      await act(async () => {
        await store.bootstrap();
      });
      render(
        <RequireAuth store={store}>
          <p>Secret content</p>
        </RequireAuth>,
      );
      expect(await screen.findByText('Secret content')).to.exist;

      const otherTab = new FakeChannel('cross-tab-room');
      await act(async () => {
        otherTab.postMessage({ type: 'logout' });
      });

      expect(await screen.findByText(/Redirected to \/login/)).to.exist;
      expect(store.getSnapshot().status).to.equal('anonymous');
    },
  },
];
