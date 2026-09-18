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

/** See prompt.md for the exact contract. */
export function createAuthStore(api: Api, channel: Channel): AuthStore {
  // TODO: implement per the prompt.
  return {
    subscribe: () => () => {},
    getSnapshot: () => ({ status: 'unknown', session: null }),
    bootstrap: async () => {},
    login: async () => {},
    logout: () => {},
    fetchWithAuth: async (path) => api.fetch(path),
  };
}

/** See prompt.md for the exact render order. */
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
  // TODO: implement per the prompt.
  return <p>Loading…</p>;
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
