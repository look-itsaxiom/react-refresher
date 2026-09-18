import { useSyncExternalStore, type ReactNode } from 'react';

export type Session = { userId: string; roles: string[] } | null;
export type AuthStatus = 'unknown' | 'anonymous' | 'authenticated';
export type AuthState = { status: AuthStatus; session: Session };

export type Api = {
  me(): Promise<Session>;
  login(creds: { username: string; password: string }): Promise<Session>;
  fetch(path: string): Promise<{ status: number; body: string }>;
  refresh(): Promise<Session>;
};

export type Channel = {
  postMessage(data: unknown): void;
  onmessage: ((ev: { data: unknown }) => void) | null;
};

export type AuthStore = {
  subscribe(cb: () => void): () => void;
  getSnapshot(): AuthState;
  bootstrap(): Promise<void>;
  login(creds: { username: string; password: string }): Promise<void>;
  logout(): void;
  fetchWithAuth(path: string): Promise<{ status: number; body: string }>;
};

/**
 * A fake stand-in for BroadcastChannel: any two Channels constructed with the same
 * `name` are "the same channel" and deliver messages to each other, but never to
 * themselves (matching real BroadcastChannel semantics).
 */
export class FakeChannel implements Channel {
  private static rooms = new Map<string, Set<FakeChannel>>();
  onmessage: ((ev: { data: unknown }) => void) | null = null;

  constructor(private readonly name: string) {
    let room = FakeChannel.rooms.get(name);
    if (!room) {
      room = new Set();
      FakeChannel.rooms.set(name, room);
    }
    room.add(this);
  }

  postMessage(data: unknown): void {
    const room = FakeChannel.rooms.get(this.name);
    if (!room) return;
    for (const other of room) {
      if (other === this) continue;
      other.onmessage?.({ data });
    }
  }
}

/** Provided: models routing without a real router. */
export function Redirect({ to }: { to: string }) {
  return <p data-testid="redirect">Redirected to {to}</p>;
}

function sessionToState(session: Session): AuthState {
  return session ? { status: 'authenticated', session } : { status: 'anonymous', session: null };
}

export function createAuthStore(api: Api, channel: Channel): AuthStore {
  let state: AuthState = { status: 'unknown', session: null };
  const listeners = new Set<() => void>();

  function setState(next: AuthState) {
    state = next;
    listeners.forEach((listener) => listener());
  }

  channel.onmessage = (ev) => {
    const data = ev.data as { type?: string } | null;
    if (data && data.type === 'logout') {
      setState({ status: 'anonymous', session: null });
    }
  };

  let bootstrapPromise: Promise<void> | null = null;
  let refreshPromise: Promise<Session> | null = null;

  return {
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot() {
      return state;
    },
    bootstrap() {
      if (!bootstrapPromise) {
        bootstrapPromise = api.me().then((session) => {
          setState(sessionToState(session));
        });
      }
      return bootstrapPromise;
    },
    async login(creds) {
      const session = await api.login(creds);
      setState(sessionToState(session));
    },
    logout() {
      setState({ status: 'anonymous', session: null });
      channel.postMessage({ type: 'logout' });
    },
    async fetchWithAuth(path) {
      const first = await api.fetch(path);
      if (first.status !== 401) return first;

      if (!refreshPromise) {
        refreshPromise = api.refresh().finally(() => {
          refreshPromise = null;
        });
      }
      const session = await refreshPromise;
      setState(sessionToState(session));
      if (!session) return first;
      return api.fetch(path);
    },
  };
}

export function RequireAuth({
  store,
  roles,
  children,
}: {
  store: AuthStore;
  roles?: string[];
  children: ReactNode;
}) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);

  if (state.status === 'unknown') {
    return <p>Loading…</p>;
  }
  if (state.status === 'anonymous') {
    return <Redirect to="/login" />;
  }
  if (roles && roles.length > 0) {
    const sessionRoles = state.session?.roles ?? [];
    const allowed = roles.some((role) => sessionRoles.includes(role));
    if (!allowed) return <p>Forbidden</p>;
  }
  return <>{children}</>;
}

const demoApi: Api = {
  me: async () => ({ userId: 'u1', roles: ['member'] }),
  login: async () => ({ userId: 'u1', roles: ['member'] }),
  fetch: async () => ({ status: 200, body: 'ok' }),
  refresh: async () => ({ userId: 'u1', roles: ['member'] }),
};
const demoStore = createAuthStore(demoApi, new FakeChannel('demo'));
void demoStore.bootstrap();

export default function App() {
  return (
    <RequireAuth store={demoStore}>
      <p>Welcome back.</p>
    </RequireAuth>
  );
}
