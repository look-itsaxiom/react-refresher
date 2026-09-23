export type Task = {
  id: string;
  version: number;
  status: string;
  title: string;
  assignee: string;
  updatedAt: Record<string, number>;
};

export type Update = {
  version: number;
  patch: Partial<Pick<Task, 'status' | 'title' | 'assignee'>>;
  by: string;
  at: number;
};

export type ApplyResult =
  | { ok: true; task: Task }
  | { ok: false; conflict: { expected: number; actual: number; theirs: Task } };

// TODO: implement both policies — see prompt.md.
export function applyUpdate(current: Task, update: Update, policy: 'optimistic-lock' | 'lww-field'): ApplyResult {
  return { ok: true, task: current };
}

// TODO: implement the simplified three-way line merge — see prompt.md.
export function mergeText(base: string, a: string, b: string): { merged: string; hasConflict: boolean } {
  return { merged: base, hasConflict: false };
}

export type ChangeEvent<T = unknown> = { cursor: number; visibleTo: string[]; payload: T };

// TODO: implement publish/subscribe with buffered replay — see prompt.md.
export function createChangeFeed<T = unknown>() {
  function publish(event: { visibleTo: string[]; payload: T }): ChangeEvent<T> {
    return { cursor: 0, visibleTo: event.visibleTo, payload: event.payload };
  }
  function subscribe(orgId: string, listener: (event: ChangeEvent<T>) => void, since?: number): () => void {
    return () => {};
  }
  return { publish, subscribe };
}

export type PresenceEntry = { userId: string; name: string; lastSeen: number };

// TODO: mark stale entries (now - lastSeen > 30_000) — see prompt.md.
export function PresenceBar({ presence, now }: { presence: PresenceEntry[]; now: number }) {
  return (
    <ul data-testid="presence-bar">
      {presence.map((p) => (
        <li key={p.userId} data-testid={`presence-${p.userId}`} data-stale="false">
          {p.name}
        </li>
      ))}
    </ul>
  );
}

const sampleTask: Task = {
  id: 'task-1',
  version: 3,
  status: 'in-progress',
  title: 'Torque test rig calibration',
  assignee: 'user:3',
  updatedAt: { status: 1000, title: 1000, assignee: 1000 },
};

const applyResult = applyUpdate(sampleTask, { version: 3, patch: { status: 'blocked' }, by: 'user:3', at: 2000 }, 'optimistic-lock');
const mergeResult = mergeText('a\nb\nc', 'a\nB\nc', 'a\nb\nc');

export default function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h3>applyUpdate</h3>
      <pre>{JSON.stringify(applyResult, null, 2)}</pre>
      <h3>mergeText</h3>
      <pre>{mergeResult.merged}</pre>
      <h3>Presence</h3>
      <PresenceBar
        now={100_000}
        presence={[
          { userId: 'u1', name: 'Priya', lastSeen: 99_000 },
          { userId: 'u2', name: 'Wei', lastSeen: 60_000 },
        ]}
      />
    </div>
  );
}
