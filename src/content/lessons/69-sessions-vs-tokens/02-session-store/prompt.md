# Build a session store with real lifecycle rules

The concept step named the rules; this exercise makes you enforce them. `App.tsx`
exports `createSessionStore(config)`, a factory for an in-memory session store — the
same shape a real server would back with Redis or a database table, minus the network.

```ts
type SessionRecord = { id: string; userId: string; createdAt: number; lastAccessAt: number };

type SessionStoreConfig = {
  clock: () => number; // current time in ms -- injected so tests can control it
  idleTimeoutMs: number;
  absoluteTimeoutMs: number;
  idFactory: () => string; // generates a new session id
};

type SessionStore = {
  create(userId: string): string; // returns the new session id
  resolve(sessionId: string): SessionRecord | null;
  rotate(sessionId: string): string | null; // returns the new id, or null if the old one was invalid
  revokeAll(userId: string): void;
  activeCount(): number;
};
```

Implement `createSessionStore` to satisfy every method:

## `create(userId)`

Generate a new id with `idFactory()`, store a record `{ id, userId, createdAt: clock(),
lastAccessAt: clock() }`, and return the id.

## `resolve(sessionId)`

Look up the record. Return `null` (and forget the record — don't let a dead session
answer a second lookup) if:

- the id doesn't exist, or
- `clock() - lastAccessAt > idleTimeoutMs` (idle timeout), or
- `clock() - createdAt > absoluteTimeoutMs` (absolute timeout, regardless of activity).

Otherwise, this is a **sliding** window: update `lastAccessAt` to `clock()` and return the
(updated) record.

## `rotate(sessionId)`

Meant for login and privilege-change moments. If `sessionId` doesn't currently `resolve`
to a valid record, return `null` and change nothing. Otherwise: generate a brand new id,
carry the same `userId` and `createdAt` forward, set `lastAccessAt` to `clock()`, delete
the old id entirely (it must not `resolve` anymore), store the new one, and return the
new id.

## `revokeAll(userId)`

Delete every session belonging to that user. Nothing to return.

## `activeCount()`

Return the number of sessions that are currently valid — i.e., the count you'd get if you
`resolve`d every stored id right now and counted the non-null results. Expired-but-not-yet-
looked-up sessions don't count.

## Why this matters

A session store with a fixed TTL and no sliding window logs an active user out mid-task.
One with a sliding window but no absolute cap never logs anyone out as long as they stay
active, which is its own risk for a stolen, still-active session. `rotate` without
deleting the old id is a session-fixation bug waiting for a report.
