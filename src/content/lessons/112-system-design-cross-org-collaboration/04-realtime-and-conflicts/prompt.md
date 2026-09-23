# Model the real-time and conflict layer

Implement four pieces of the "multiplayer" mechanics from the concept step: two concurrency
policies, a three-way text merge, a filtered change feed, and a presence indicator.

## Types

```ts
type Task = {
  id: string;
  version: number;
  status: string;
  title: string;
  assignee: string;
  updatedAt: Record<string, number>; // per-field last-write timestamp (ms)
};

type Update = {
  version: number; // the version this update was based on
  patch: Partial<Pick<Task, 'status' | 'title' | 'assignee'>>;
  by: string;
  at: number; // when this update was made (ms)
};

type ApplyResult =
  | { ok: true; task: Task }
  | { ok: false; conflict: { expected: number; actual: number; theirs: Task } };
```

## `applyUpdate`

```ts
function applyUpdate(current: Task, update: Update, policy: 'optimistic-lock' | 'lww-field'): ApplyResult;
```

- **`'optimistic-lock'`**: if `update.version !== current.version`, reject —
  return `{ ok: false, conflict: { expected: update.version, actual: current.version, theirs: current } }`
  and leave `current` untouched. Otherwise apply the whole patch, bump `version` by 1, and
  return `{ ok: true, task }`. This policy never inspects `updatedAt`.
- **`'lww-field'`**: never rejects — always returns `{ ok: true, task }`. Ignore
  `update.version` entirely. For each field in `update.patch`, apply it only if
  `update.at` is at or after `current.updatedAt[field]` (or that field has never been
  written); otherwise leave that one field as it was. Whichever fields you do apply, record
  `update.at` as their new `updatedAt` entry. `version` still increments by 1 on every call,
  win or lose per field — it's a "something happened" counter, not a lock.

## `mergeText`

```ts
function mergeText(base: string, a: string, b: string): { merged: string; hasConflict: boolean };
```

A simplified three-way line merge. Split all three strings on `'\n'`. Compare line by line,
by index (this function intentionally does not align inserted or deleted lines — that's the
gap a real CRDT closes, which is the point the concept step makes about `mergeText` vs.
Yjs/Automerge):

- Neither side changed a line from `base`: keep the base line.
- Only one side changed it: take that side's line.
- Both sides changed it to the *same* new line: take that line (no conflict).
- Both sides changed it to *different* new lines: it's a conflict. Insert, in place of that
  line:
  ```
  <<<<<<< a
  <a's line>
  =======
  <b's line>
  >>>>>>> b
  ```
  and set `hasConflict` to `true` for the whole result.

Join the resulting lines back with `'\n'` for `merged`.

## `createChangeFeed`

```ts
function createChangeFeed<T = unknown>(): {
  publish(event: { visibleTo: string[]; payload: T }): { cursor: number; visibleTo: string[]; payload: T };
  subscribe(
    orgId: string,
    listener: (event: { cursor: number; visibleTo: string[]; payload: T }) => void,
    since?: number,
  ): () => void; // returns an unsubscribe function
};
```

`publish` assigns each event an increasing `cursor` (starting at 1), buffers it, and
delivers it synchronously to every currently-subscribed listener whose `orgId` appears in
`event.visibleTo` — never to a listener for an org that isn't. `subscribe` registers a live
listener for future publishes; when called with `since`, it first replays every buffered
event with `cursor > since` that the org can see (in cursor order), *before* going live —
that's the reconnect/resync path. Without `since`, it only gets events published after it
subscribes.

## `PresenceBar`

```tsx
type PresenceEntry = { userId: string; name: string; lastSeen: number };

function PresenceBar(props: { presence: PresenceEntry[]; now: number }): JSX.Element;
```

Render a list where each entry is reachable by `screen.getByTestId(\`presence-${userId}\`)`.
An entry is **stale** when `now - lastSeen > 30_000` (30 seconds); mark stale entries with
`data-stale="true"` on that element (fresh ones get `data-stale="false"`) and visibly append
`' (away)'` to a stale user's displayed name.

## Ship something visible

The default `App` export already wires a sample task update, merge, and `PresenceBar` call
together — keep it working once the functions above are implemented.
