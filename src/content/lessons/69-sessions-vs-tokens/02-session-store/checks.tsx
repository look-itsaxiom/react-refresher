import type { Check } from '../../../types';

type SessionRecord = { id: string; userId: string; createdAt: number; lastAccessAt: number };
type SessionStoreConfig = {
  clock: () => number;
  idleTimeoutMs: number;
  absoluteTimeoutMs: number;
  idFactory: () => string;
};
type SessionStore = {
  create(userId: string): string;
  resolve(sessionId: string): SessionRecord | null;
  rotate(sessionId: string): string | null;
  revokeAll(userId: string): void;
  activeCount(): number;
};
type Mod = { createSessionStore: (config: SessionStoreConfig) => SessionStore };

function fakeClock(startMs = 0) {
  let now = startMs;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

function fakeIdFactory(prefix = 'sess') {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

export const checks: Check[] = [
  {
    name: 'create + resolve returns a record with the right userId and does not expire immediately',
    run: async ({ mod, expect }) => {
      const { createSessionStore } = mod as unknown as Mod;
      const clock = fakeClock();
      const store = createSessionStore({ clock: clock.now, idleTimeoutMs: 1000, absoluteTimeoutMs: 10_000, idFactory: fakeIdFactory() });
      const id = store.create('alice');
      expect(id).to.equal('sess-1');
      const record = store.resolve(id);
      expect(record, 'a freshly created session should resolve').to.not.equal(null);
      expect(record!.userId).to.equal('alice');
    },
  },
  {
    name: 'resolve returns null for an unknown session id',
    run: async ({ mod, expect }) => {
      const { createSessionStore } = mod as unknown as Mod;
      const clock = fakeClock();
      const store = createSessionStore({ clock: clock.now, idleTimeoutMs: 1000, absoluteTimeoutMs: 10_000, idFactory: fakeIdFactory() });
      expect(store.resolve('nope')).to.equal(null);
    },
  },
  {
    name: 'idle timeout expires a session that goes untouched, and the sliding window extends it when accessed',
    run: async ({ mod, expect }) => {
      const { createSessionStore } = mod as unknown as Mod;
      const clock = fakeClock();
      const store = createSessionStore({ clock: clock.now, idleTimeoutMs: 100, absoluteTimeoutMs: 100_000, idFactory: fakeIdFactory() });
      const id = store.create('alice');

      // Access at t=60 (before the 100ms idle window) should slide it forward.
      clock.advance(60);
      expect(store.resolve(id), 'access before idle timeout should succeed and slide the window').to.not.equal(null);

      // Now at t=60+60=120: without the slide, this would already be dead
      // (120 > 100 from t=0). With the slide (last access at t=60), it's
      // still alive (120 - 60 = 60 < 100).
      clock.advance(60);
      expect(store.resolve(id), 'a sliding window should keep an actively-used session alive past the original deadline').to.not.equal(null);

      // Now let it sit idle for the full window.
      clock.advance(150);
      expect(store.resolve(id), 'a session idle past the timeout should expire').to.equal(null);
    },
  },
  {
    name: 'absolute timeout expires a session even if it is accessed continuously',
    run: async ({ mod, expect }) => {
      const { createSessionStore } = mod as unknown as Mod;
      const clock = fakeClock();
      const store = createSessionStore({ clock: clock.now, idleTimeoutMs: 1000, absoluteTimeoutMs: 250, idFactory: fakeIdFactory() });
      const id = store.create('alice');

      // Access frequently, well within the idle window every time.
      for (let i = 0; i < 4; i++) {
        clock.advance(80);
        const record = store.resolve(id);
        if (clock.now() <= 250) {
          expect(record, `access at t=${clock.now()} should still be within the absolute timeout`).to.not.equal(null);
        }
      }
      // By now clock.now() === 320, past the 250ms absolute cap, despite
      // constant activity.
      expect(store.resolve(id), 'absolute timeout must expire the session regardless of activity').to.equal(null);
    },
  },
  {
    name: 'an expired session is forgotten, not just reported as invalid once',
    run: async ({ mod, expect }) => {
      const { createSessionStore } = mod as unknown as Mod;
      const clock = fakeClock();
      const store = createSessionStore({ clock: clock.now, idleTimeoutMs: 50, absoluteTimeoutMs: 10_000, idFactory: fakeIdFactory() });
      store.create('alice');
      clock.advance(100);
      expect(store.activeCount(), 'an idle-expired session should not be counted as active').to.equal(0);
    },
  },
  {
    name: 'rotate issues a new id, invalidates the old one, and preserves the userId (login rotation)',
    run: async ({ mod, expect }) => {
      const { createSessionStore } = mod as unknown as Mod;
      const clock = fakeClock();
      const store = createSessionStore({ clock: clock.now, idleTimeoutMs: 10_000, absoluteTimeoutMs: 100_000, idFactory: fakeIdFactory() });
      const anonId = store.create('guest-42');
      const loginId = store.rotate(anonId);
      expect(loginId, 'rotating a valid session should return a new id').to.be.a('string');
      expect(loginId).to.not.equal(anonId);
      expect(store.resolve(anonId), 'the pre-rotation id must no longer resolve').to.equal(null);
      const record = store.resolve(loginId!);
      expect(record, 'the new id should resolve').to.not.equal(null);
      expect(record!.userId).to.equal('guest-42');
    },
  },
  {
    name: 'rotate on privilege change: two rotations in sequence each invalidate exactly their own predecessor',
    run: async ({ mod, expect }) => {
      const { createSessionStore } = mod as unknown as Mod;
      const clock = fakeClock();
      const store = createSessionStore({ clock: clock.now, idleTimeoutMs: 10_000, absoluteTimeoutMs: 100_000, idFactory: fakeIdFactory() });
      const guestId = store.create('user-7');
      const loginId = store.rotate(guestId); // login
      clock.advance(10);
      const adminId = store.rotate(loginId!); // promoted to admin mid-session

      expect(store.resolve(guestId), 'the original guest session must be dead').to.equal(null);
      expect(store.resolve(loginId!), 'the post-login, pre-promotion session must be dead').to.equal(null);
      const finalRecord = store.resolve(adminId!);
      expect(finalRecord, 'the post-promotion session should be alive').to.not.equal(null);
      expect(finalRecord!.userId).to.equal('user-7');
      expect(store.activeCount(), 'only the final rotated session should be active').to.equal(1);
    },
  },
  {
    name: 'rotate on an already-invalid session id returns null and changes nothing',
    run: async ({ mod, expect }) => {
      const { createSessionStore } = mod as unknown as Mod;
      const clock = fakeClock();
      const store = createSessionStore({ clock: clock.now, idleTimeoutMs: 1000, absoluteTimeoutMs: 10_000, idFactory: fakeIdFactory() });
      expect(store.rotate('never-existed')).to.equal(null);
    },
  },
  {
    name: 'revokeAll kills every session for a user without touching other users, and activeCount reflects it',
    run: async ({ mod, expect }) => {
      const { createSessionStore } = mod as unknown as Mod;
      const clock = fakeClock();
      const store = createSessionStore({ clock: clock.now, idleTimeoutMs: 10_000, absoluteTimeoutMs: 100_000, idFactory: fakeIdFactory() });
      const a1 = store.create('alice');
      const a2 = store.create('alice');
      const b1 = store.create('bob');
      expect(store.activeCount()).to.equal(3);

      store.revokeAll('alice');

      expect(store.resolve(a1)).to.equal(null);
      expect(store.resolve(a2)).to.equal(null);
      expect(store.resolve(b1), "bob's session must survive alice's revocation").to.not.equal(null);
      expect(store.activeCount()).to.equal(1);
    },
  },
];
