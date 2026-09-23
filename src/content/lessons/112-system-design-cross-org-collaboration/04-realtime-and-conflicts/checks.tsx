import type { Check } from '../../../types';

type Task = {
  id: string;
  version: number;
  status: string;
  title: string;
  assignee: string;
  updatedAt: Record<string, number>;
};

type Update = {
  version: number;
  patch: Partial<Pick<Task, 'status' | 'title' | 'assignee'>>;
  by: string;
  at: number;
};

type ApplyResult =
  | { ok: true; task: Task }
  | { ok: false; conflict: { expected: number; actual: number; theirs: Task } };

type ChangeEvent<T = unknown> = { cursor: number; visibleTo: string[]; payload: T };

type Mod = {
  applyUpdate: (current: Task, update: Update, policy: 'optimistic-lock' | 'lww-field') => ApplyResult;
  mergeText: (base: string, a: string, b: string) => { merged: string; hasConflict: boolean };
  createChangeFeed: <T = unknown>() => {
    publish: (event: { visibleTo: string[]; payload: T }) => ChangeEvent<T>;
    subscribe: (orgId: string, listener: (event: ChangeEvent<T>) => void, since?: number) => () => void;
  };
};

function baseTask(): Task {
  return {
    id: 'task-1',
    version: 3,
    status: 'in-progress',
    title: 'Torque test rig calibration',
    assignee: 'user:3',
    updatedAt: { status: 1000, title: 1000, assignee: 1000 },
  };
}

export const checks: Check[] = [
  {
    name: 'optimistic-lock: a matching version applies the patch and bumps the version',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { applyUpdate } = mod as unknown as Mod;
      const current = baseTask();
      const result = applyUpdate(current, { version: 3, patch: { status: 'blocked' }, by: 'user:3', at: 2000 }, 'optimistic-lock');
      expect(result.ok).to.equal(true);
      if (result.ok) {
        expect(result.task.status).to.equal('blocked');
        expect(result.task.version).to.equal(4);
      }
    },
  },
  {
    name: 'optimistic-lock: a stale version is rejected with expected/actual/theirs, current is untouched',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { applyUpdate } = mod as unknown as Mod;
      const current = baseTask();
      const result = applyUpdate(current, { version: 2, patch: { status: 'done' }, by: 'user:5', at: 2000 }, 'optimistic-lock');
      expect(result.ok).to.equal(false);
      if (!result.ok) {
        expect(result.conflict.expected).to.equal(2);
        expect(result.conflict.actual).to.equal(3);
        expect(result.conflict.theirs.status).to.equal('in-progress');
      }
    },
  },
  {
    name: 'lww-field: a newer write wins for that field and always reports ok',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { applyUpdate } = mod as unknown as Mod;
      const current = baseTask();
      const result = applyUpdate(current, { version: 999, patch: { status: 'blocked' }, by: 'user:3', at: 2000 }, 'lww-field');
      expect(result.ok).to.equal(true);
      if (result.ok) {
        expect(result.task.status).to.equal('blocked');
        expect(result.task.updatedAt.status).to.equal(2000);
        expect(result.task.version).to.equal(4);
      }
    },
  },
  {
    name: 'lww-field: an older write loses per-field, a concurrent newer write on another field still applies',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { applyUpdate } = mod as unknown as Mod;
      const current: Task = { ...baseTask(), updatedAt: { status: 5000, title: 1000, assignee: 1000 } };
      const result = applyUpdate(
        current,
        { version: 1, patch: { status: 'blocked', title: 'Revised calibration plan' }, by: 'user:5', at: 3000 },
        'lww-field',
      );
      expect(result.ok).to.equal(true);
      if (result.ok) {
        expect(result.task.status).to.equal('in-progress'); // stale write lost to the field's later timestamp
        expect(result.task.title).to.equal('Revised calibration plan'); // this field had no later write, so it applies
        expect(result.task.updatedAt.title).to.equal(3000);
        expect(result.task.updatedAt.status).to.equal(5000); // unchanged
      }
    },
  },
  {
    name: 'mergeText: only one side changing a line produces no conflict',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { mergeText } = mod as unknown as Mod;
      const result = mergeText('a\nb\nc', 'a\nB\nc', 'a\nb\nc');
      expect(result.hasConflict).to.equal(false);
      expect(result.merged).to.equal('a\nB\nc');
    },
  },
  {
    name: 'mergeText: both sides making the identical change is not a conflict',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { mergeText } = mod as unknown as Mod;
      const result = mergeText('a\nb\nc', 'a\nZ\nc', 'a\nZ\nc');
      expect(result.hasConflict).to.equal(false);
      expect(result.merged).to.equal('a\nZ\nc');
    },
  },
  {
    name: 'mergeText: both sides changing the same line differently is a marked conflict',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { mergeText } = mod as unknown as Mod;
      const result = mergeText('a\nb\nc', 'a\nX\nc', 'a\nY\nc');
      expect(result.hasConflict).to.equal(true);
      expect(result.merged).to.include('<<<<<<< a');
      expect(result.merged).to.include('X');
      expect(result.merged).to.include('=======');
      expect(result.merged).to.include('Y');
      expect(result.merged).to.include('>>>>>>> b');
    },
  },
  {
    name: 'createChangeFeed: a late subscriber with since replays only buffered events it can see',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createChangeFeed } = mod as unknown as Mod;
      const feed = createChangeFeed<string>();
      feed.publish({ visibleTo: ['org:1', 'org:2'], payload: 'customer note' });
      feed.publish({ visibleTo: ['org:1'], payload: 'customer-only note' });

      const received: string[] = [];
      feed.subscribe('org:2', (e) => received.push(e.payload), 0);

      expect(received).to.deep.equal(['customer note']);
    },
  },
  {
    name: 'createChangeFeed: live events only deliver to orgs listed in visibleTo',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { createChangeFeed } = mod as unknown as Mod;
      const feed = createChangeFeed<string>();

      const org1Received: string[] = [];
      const org3Received: string[] = [];
      feed.subscribe('org:1', (e) => org1Received.push(e.payload));
      feed.subscribe('org:3', (e) => org3Received.push(e.payload));

      feed.publish({ visibleTo: ['org:1'], payload: 'vendor A task update' });

      expect(org1Received).to.deep.equal(['vendor A task update']);
      expect(org3Received).to.deep.equal([]);
    },
  },
  {
    name: 'PresenceBar renders every user and marks only stale ones',
    run: (ctx) => {
      const { render, screen, expect } = ctx;
      const { PresenceBar } = ctx.mod as unknown as { PresenceBar: React.ComponentType<any> };
      render(
        <PresenceBar
          now={100_000}
          presence={[
            { userId: 'u1', name: 'Priya', lastSeen: 99_000 },
            { userId: 'u2', name: 'Wei', lastSeen: 60_000 },
          ]}
        />,
      );

      const fresh = screen.getByTestId('presence-u1');
      expect(fresh.getAttribute('data-stale')).to.equal('false');
      expect(fresh.textContent).to.equal('Priya');

      const stale = screen.getByTestId('presence-u2');
      expect(stale.getAttribute('data-stale')).to.equal('true');
      expect(stale.textContent).to.include('(away)');
    },
  },
];
