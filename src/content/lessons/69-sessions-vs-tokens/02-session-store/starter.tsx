export type SessionRecord = { id: string; userId: string; createdAt: number; lastAccessAt: number };

export type SessionStoreConfig = {
  clock: () => number;
  idleTimeoutMs: number;
  absoluteTimeoutMs: number;
  idFactory: () => string;
};

export type SessionStore = {
  create(userId: string): string;
  resolve(sessionId: string): SessionRecord | null;
  rotate(sessionId: string): string | null;
  revokeAll(userId: string): void;
  activeCount(): number;
};

export function createSessionStore(config: SessionStoreConfig): SessionStore {
  const { clock, idFactory } = config;
  const sessions = new Map<string, SessionRecord>();

  return {
    create(userId: string): string {
      const id = idFactory();
      const now = clock();
      sessions.set(id, { id, userId, createdAt: now, lastAccessAt: now });
      return id;
    },

    resolve(sessionId: string): SessionRecord | null {
      // TODO: this ignores both idle and absolute timeouts entirely, and
      // never slides lastAccessAt on a valid read.
      return sessions.get(sessionId) ?? null;
    },

    rotate(sessionId: string): string | null {
      // TODO: this doesn't check the old session is actually valid, and
      // leaves the old id resolvable -- a session-fixation bug.
      const record = sessions.get(sessionId);
      if (!record) return null;
      const newId = idFactory();
      sessions.set(newId, { ...record, id: newId });
      return newId;
    },

    revokeAll(_userId: string): void {
      // TODO: not implemented.
    },

    activeCount(): number {
      // TODO: doesn't account for expired-but-still-stored sessions.
      return sessions.size;
    },
  };
}

export default function App() {
  return (
    <div>
      <p>Open the console/tests to exercise createSessionStore.</p>
    </div>
  );
}
