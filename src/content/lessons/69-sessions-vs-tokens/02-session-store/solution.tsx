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
  const { clock, idleTimeoutMs, absoluteTimeoutMs, idFactory } = config;
  const sessions = new Map<string, SessionRecord>();

  function isExpired(record: SessionRecord, now: number): boolean {
    return now - record.lastAccessAt > idleTimeoutMs || now - record.createdAt > absoluteTimeoutMs;
  }

  function resolve(sessionId: string): SessionRecord | null {
    const record = sessions.get(sessionId);
    if (!record) return null;
    const now = clock();
    if (isExpired(record, now)) {
      sessions.delete(sessionId);
      return null;
    }
    // Sliding idle window: a valid access pushes the idle deadline out.
    const updated: SessionRecord = { ...record, lastAccessAt: now };
    sessions.set(sessionId, updated);
    return updated;
  }

  return {
    create(userId: string): string {
      const id = idFactory();
      const now = clock();
      sessions.set(id, { id, userId, createdAt: now, lastAccessAt: now });
      return id;
    },

    resolve,

    rotate(sessionId: string): string | null {
      const record = resolve(sessionId);
      if (!record) return null;
      const newId = idFactory();
      sessions.delete(sessionId);
      sessions.set(newId, { id: newId, userId: record.userId, createdAt: record.createdAt, lastAccessAt: clock() });
      return newId;
    },

    revokeAll(userId: string): void {
      for (const [id, record] of sessions) {
        if (record.userId === userId) sessions.delete(id);
      }
    },

    activeCount(): number {
      let count = 0;
      const now = clock();
      for (const [id, record] of [...sessions]) {
        if (isExpired(record, now)) {
          sessions.delete(id);
        } else {
          count++;
        }
      }
      return count;
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
