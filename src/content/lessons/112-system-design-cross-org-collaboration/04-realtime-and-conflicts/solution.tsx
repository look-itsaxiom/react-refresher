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

export function applyUpdate(current: Task, update: Update, policy: 'optimistic-lock' | 'lww-field'): ApplyResult {
  if (policy === 'optimistic-lock') {
    if (update.version !== current.version) {
      return { ok: false, conflict: { expected: update.version, actual: current.version, theirs: current } };
    }
    const nextUpdatedAt = { ...current.updatedAt };
    for (const field of Object.keys(update.patch)) nextUpdatedAt[field] = update.at;
    return {
      ok: true,
      task: { ...current, ...update.patch, version: current.version + 1, updatedAt: nextUpdatedAt },
    };
  }

  // policy === 'lww-field'
  const patch: Partial<Task> = {};
  const nextUpdatedAt = { ...current.updatedAt };
  for (const [field, value] of Object.entries(update.patch)) {
    const lastWrite = current.updatedAt[field];
    if (lastWrite === undefined || update.at >= lastWrite) {
      (patch as Record<string, unknown>)[field] = value;
      nextUpdatedAt[field] = update.at;
    }
  }
  return { ok: true, task: { ...current, ...patch, version: current.version + 1, updatedAt: nextUpdatedAt } };
}

export function mergeText(base: string, a: string, b: string): { merged: string; hasConflict: boolean } {
  const baseLines = base.split('\n');
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const len = Math.max(baseLines.length, aLines.length, bLines.length);
  const out: string[] = [];
  let hasConflict = false;

  for (let i = 0; i < len; i++) {
    const baseLine = baseLines[i] ?? '';
    const aLine = aLines[i] ?? '';
    const bLine = bLines[i] ?? '';
    const aChanged = aLine !== baseLine;
    const bChanged = bLine !== baseLine;

    if (!aChanged && !bChanged) {
      out.push(baseLine);
    } else if (aChanged && !bChanged) {
      out.push(aLine);
    } else if (!aChanged && bChanged) {
      out.push(bLine);
    } else if (aLine === bLine) {
      out.push(aLine);
    } else {
      hasConflict = true;
      out.push('<<<<<<< a', aLine, '=======', bLine, '>>>>>>> b');
    }
  }

  return { merged: out.join('\n'), hasConflict };
}

export type ChangeEvent<T = unknown> = { cursor: number; visibleTo: string[]; payload: T };

export function createChangeFeed<T = unknown>() {
  let cursor = 0;
  const buffer: ChangeEvent<T>[] = [];
  const subscribers: Array<{ orgId: string; listener: (event: ChangeEvent<T>) => void }> = [];

  function publish(event: { visibleTo: string[]; payload: T }): ChangeEvent<T> {
    cursor += 1;
    const full: ChangeEvent<T> = { cursor, visibleTo: event.visibleTo, payload: event.payload };
    buffer.push(full);
    for (const sub of subscribers) {
      if (full.visibleTo.includes(sub.orgId)) sub.listener(full);
    }
    return full;
  }

  function subscribe(orgId: string, listener: (event: ChangeEvent<T>) => void, since?: number): () => void {
    if (since !== undefined) {
      for (const e of buffer) {
        if (e.cursor > since && e.visibleTo.includes(orgId)) listener(e);
      }
    }
    const entry = { orgId, listener };
    subscribers.push(entry);
    return () => {
      const idx = subscribers.indexOf(entry);
      if (idx !== -1) subscribers.splice(idx, 1);
    };
  }

  return { publish, subscribe };
}

export type PresenceEntry = { userId: string; name: string; lastSeen: number };

export function PresenceBar({ presence, now }: { presence: PresenceEntry[]; now: number }) {
  return (
    <ul data-testid="presence-bar">
      {presence.map((p) => {
        const stale = now - p.lastSeen > 30_000;
        return (
          <li key={p.userId} data-testid={`presence-${p.userId}`} data-stale={stale ? 'true' : 'false'}>
            {p.name}
            {stale ? ' (away)' : ''}
          </li>
        );
      })}
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
