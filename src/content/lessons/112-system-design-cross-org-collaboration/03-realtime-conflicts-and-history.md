# Real time, conflicts, and history

"Multiplayer project management software" is Integrate's own description of the product,
and it's worth taking apart precisely, because the honest engineering answer is narrower
than the marketing phrase suggests: most of what makes structured data (a task's status, its
assignee, its due date) feel multiplayer is **presence plus fast invalidation**, not a
general-purpose conflict-free replication scheme. Free text — a comment body, a shared
document — is the part that actually needs the heavier machinery. Knowing which is which,
and why, is the part of this concept an interviewer is listening for.

## Delivering updates

Four ways a client learns something changed, roughly in order of complexity:

- **Polling.** Simplest possible thing; refetch every N seconds. Fine for a dashboard nobody
  is staring at, wasteful and laggy for a live program review with forty people watching one
  task board.
- **Server-Sent Events (SSE).** One-directional (server → client) stream over plain HTTP,
  built into the browser via `EventSource`, auto-reconnects. A good fit when the client only
  needs to *receive* change notifications and issues writes through normal REST/GraphQL
  calls — which is most of this product's traffic pattern.
- **WebSocket.** Full-duplex, more setup (its own connection lifecycle, no automatic
  reconnect — you write that yourself), worth it when the client also needs to push
  low-latency signals the other direction, like presence or cursor position.
- **GraphQL subscriptions.** The GraphQL-native way to express "notify me when this changes,"
  typically implemented over WebSocket or SSE under the hood — pick this when the rest of
  the product API is already GraphQL and you want subscription payloads shaped by the same
  schema as your queries.

Fan-out — getting a change from "one write happened" to "every relevant open connection
knows about it" — is the part people skip over. Three real patterns: **Postgres
`LISTEN`/`NOTIFY`** (a write triggers a `NOTIFY`, connected backend processes `LISTEN`ing on
that channel receive it and push to their own connected clients — simple, built into
Postgres, but payloads are capped at 8000 bytes and delivery isn't guaranteed if no one is
listening at the moment of the `NOTIFY`, so treat it as a wakeup signal, not a durable log);
**Redis pub/sub** (similar shape, decoupled from the database, same at-most-once caveat);
and a **change feed built on the outbox pattern** (a write and an `events` row land in the
same transaction, a separate process tails that table — logical decoding or simple polling —
and fans out from there, which is the durable option because the event isn't lost if nobody
was subscribed at the moment of the write). This lesson's second exercise builds a
simplified version of the outbox-fed feed: `publish` writes an event with a cursor,
`subscribe` can pass `since` to replay anything missed — the resync story a real client needs
after a dropped connection.

**Presence** — who's currently looking at this program, whose cursor is where — is usually
its own separate, ephemeral channel: ping on an interval, expire anyone whose last ping is
older than a short window, never persisted. That's exactly what this lesson's `PresenceBar`
exercise implements.

## Concurrency control: the real "multiplayer" question

When two people edit the same task at close to the same time, what happens? Three answers,
each right for a different kind of field:

- **Optimistic locking.** Every row carries a `version` column. A write includes the version
  it read; if the current row's version has moved on, the write is rejected with a
  conflict (HTTP 409, or a typed error in GraphQL) instead of silently overwriting someone
  else's change. Simple, easy to reason about, and the correct default for most structured
  fields — but it means the second writer has to retry, which is a real interruption if it
  happens often.
- **Last-writer-wins per field (LWW).** Instead of one version for the whole row, track a
  timestamp per field. Two people editing different fields of the same task never conflict
  at all; two people editing the *same* field resolve by timestamp, with no error surfaced —
  whoever's write has the later timestamp simply wins, silently. This is a real technique
  (it's how a lot of "just works" multiplayer structured-data editing behaves in practice),
  and its failure mode is exactly what it sounds like: a legitimate edit can vanish with no
  conflict shown to the user who made it. That's an acceptable tradeoff for a `status` enum
  where a stale value gets corrected on the next glance; it's a bad tradeoff for anything
  where silently losing data matters.
- **CRDTs (conflict-free replicated data types)** for free text. **Yjs** and **Automerge**
  are the two libraries most teams reach for; both let multiple clients edit the same text
  concurrently and converge to the same result without a central server arbitrating every
  keystroke, and both support offline edits that merge cleanly on reconnect. This is
  meaningfully heavier than LWW or optimistic locking — it needs a CRDT-aware storage
  representation, not a plain `text` column, and a sync protocol between clients (again,
  hedge specifics if you haven't shipped one recently; the shape — operation-based or
  state-based convergent replication — is the stable fact, implementation details move
  faster than this lesson can track). This lesson's `mergeText` exercise implements a
  much cruder three-way line merge instead — good enough to demonstrate *why* teams reach
  for a real CRDT once you see it fail on anything but the simplest edits (no insertions, no
  deletions, just line-for-line changes) and mark a genuine conflict with `<<<<<<<` markers
  when it can't resolve one.

The honest framing for an interview: structured fields (status, assignee, due date) use
optimistic locking or LWW — server-authoritative, cheap, predictable. Free text (a comment,
a rich description) is the only place a CRDT earns its complexity. Don't reach for Yjs to
solve a `status` field; don't reach for a `version` column to solve concurrent comment
editing.

## Offline and reconnection

A vendor engineer's laptop drops Wi-Fi mid-review, reconnects two minutes later. The client
needs to resync, not just resubscribe: send the last cursor it saw, the server replays every
event since (from the durable outbox-backed feed, not the ephemeral pub/sub layer, which
already lost anything published while disconnected), and only then does the client trust its
local state again. This is the same `since` parameter the change-feed exercise implements.

## Audit history

For a compliance-sensitive customer, "who changed the schedule and when" isn't a debugging
convenience, it's a contractual requirement. Two shapes:

- **An append-only `events` table** — every mutation writes a row: who, what, when, from
  which org, before/after values. Cheap to build on top of an existing CRUD schema; queried
  directly for "show me the history of this task."
- **Event sourcing** — the events *are* the source of truth, and current state is derived by
  replaying them. More powerful (you get "what did this look like at time T" almost for
  free) and considerably more architectural commitment — most teams don't need the full
  pattern and get the audit trail they actually need from the append-only table sitting
  beside a normal mutable schema.

Either way: the log is immutable (no `UPDATE`, no `DELETE` on the events table — a
correction is a new event, not an edit to an old one), and retention/export needs to be a
real, named requirement for regulated customers, not an implicit "we'll keep it forever in
the same table as everything else."

## Cross-org visibility of events, and scaling

An event visible to the customer PM (a vendor's task slipped) may not be visible to a
*competing* vendor watching the same program — the same need-to-know rule from the first
concept step applies to the real-time feed, not just to the REST/GraphQL read path. The
`visibleTo: string[]` field on this lesson's change-feed events exists for exactly that:
fan-out has to filter, not just broadcast.

At scale: read replicas for the query-heavy dashboard traffic, partitioning by program (a
program's tasks, dependencies, and events all shard together, since almost every query is
scoped to one program), and per-org rate limits on the integration API so one vendor's buggy
script can't degrade the shared program for everyone else. Security posture at this size
means tenant-isolation tests are a real, named test suite (not an assumption): a test that
logs in as org A and asserts every attempt to read or write org B's data fails, across every
endpoint — the security track (lessons 62–67) covers the individual vulnerability classes
this defends against.

## A 45-minute answer outline

| Minutes | Section |
|---|---|
| 5 | Requirements: who, what, scale, non-functional pressure |
| 10 | Data model: entities, sharing, need-to-know visibility |
| 10 | API and authorization: GraphQL + REST/webhooks, RBAC × ReBAC, where checks run |
| 10 | Real time and conflicts: delivery mechanism, fan-out, concurrency policy per field type |
| 5 | Audit and ops: event log, scaling, tenant isolation |
| 5 | Tradeoffs: state the consistency-vs-latency tradeoff and the LWW-vs-lock tradeoff explicitly, unprompted |

Likely follow-ups, and what a strong answer sounds like:

- *"What if a vendor's org gets removed from a program mid-review?"* — the share tuple is
  revoked, the next `check()` denies; any *open* WebSocket/SSE connection for a now-revoked
  user should be force-closed, not just left to expire naturally on its own, or they keep
  receiving events they should no longer see.
- *"How do you test tenant isolation?"* — name it as its own test suite, not a side effect of
  feature tests: log in as every role/org combination, assert cross-org reads and writes
  fail, run it in CI on every PR that touches authorization code.
- *"Why not just use CRDTs for everything, so you never have to think about conflicts?"* — cost:
  every field becomes a CRDT-aware type, storage and query complexity go up, and structured
  fields with a small enum of valid values (`status`) don't actually benefit — LWW already
  gives the "just works" feel there for a fraction of the complexity.

## Further reading (optional)

- [MDN: Server-sent events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [PostgreSQL documentation: LISTEN](https://www.postgresql.org/docs/current/sql-listen.html)
- [Yjs documentation](https://docs.yjs.dev/)
- [Automerge documentation](https://automerge.org/docs/hello/)
