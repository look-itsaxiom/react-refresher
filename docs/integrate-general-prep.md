# Integrate: Full Stack Engineer interview cheat sheet

## The company in three lines

Integrate builds multiplayer project management software for deep-tech hardware programs. A customer, its vendors, and its partners all edit one program, separate legal entities, none seeing everything the others see. "Multiplayer" makes cross-org visibility and concurrent edits the hard problems, not CRUD. "Own it" means you are paged for what you ship (115).

## Likely rounds and what each probes

- **React screen.** Show diagnosis order on a slow list: colocate, then defer, then virtualize (54).
- **Go and API round.** Show a `Store` interface, one error envelope, middleware, `httptest` tests (103, 104).
- **System design.** Requirements out loud before boxes, then data model, then authorization (112).
- **Product and behavioural.** Name the user and their question first, not the stack (115).

## System design: the 45-minute answer

Timings (112): requirements 5, data model 10, API and authorization 10, real time and conflicts 10, audit and ops 5, tradeoffs 5.

**Data model.** Organizations, memberships (user by org, with a role), programs owned by one org, `project_shares` granting another org a role, tasks, task dependencies (106). What makes it multiplayer is a `visibility` flag per task: program-visible exposes status, dates, and dependency edges; org-internal stays with the owner. One row plus a filter, never two copies.

**Permissions.** RBAC inside one org, relationship-based (ReBAC, Zanzibar style) across orgs. Tuples like `program:1#viewer@org:2#member`, resolved by `check(user, action, resource)` with unions, userset subjects, parent inheritance, and a depth cap. Name SpiceDB or OpenFGA. Row-level security is the floor; the relationship service decides.

**Real time.** Server-Sent Events is the honest default: writes go through GraphQL or REST, the client only receives. WebSocket only when you also push presence. Fan out from an outbox table with a cursor so a reconnecting client replays with `since`, because `LISTEN`/`NOTIFY` and Redis pub/sub are at-most-once wakeups.

**Conflicts.** Structured fields use optimistic locking with a `version` column, rejecting with a 409. Last-writer-wins per field suits a status enum and fails where silent data loss matters. CRDTs (Yjs, Automerge) only for free text.

**Audit.** An append-only `events` table: who, what, when, which org, before and after. A correction is a new event, never an `UPDATE`. Events carry `visibleTo`, so fan-out filters rather than broadcasts.

**The tradeoff they will push on.** Consistency of permission changes versus latency of checks. Cache per request, never across requests. For a compliance customer, favor consistency: a revoked share lingering 30 seconds is a security gap.

## Talking points by technology

**React 19**

- Composition first, context second; split fast-changing selection from slow vendor lists (05).
- `isPending` stays true across an async transition's `await`, so saving indicators hold (08).
- Colocation beats memoization; virtualization beats both when DOM nodes are the cost (54).
- `useId` fixes duplicate label ids and hydration mismatches, but never as a key (09).
- Root-level `onRecoverableError` catches hydration mismatches no user saw (93).

**Go**

- Go 1.22's `http.ServeMux` matches methods and wildcards, so a router is optional (103).
- Ambiguous route patterns panic at registration, surfacing conflicts in tests (103).
- `context.Context` is the first parameter, carrying deadlines and the principal (103, 104).
- Wrap errors with `%w`, branch on sentinels, map to status codes once at the edge (104).
- Webhooks: verify signature, return 202, hand to a bounded worker pool, drain on shutdown (104).

**PostgreSQL**

- Plan smells: estimates far off actuals, a sort spilling to disk, a nested loop with many `loops` (108).
- Composite index order: equality columns, one range column, then sort columns (108).
- Partial indexes keep hot-subset queries small and let uniqueness survive soft deletes (108).
- Keyset pagination stays stable while collaborators insert; `OFFSET` skips and repeats (107, 108).
- Expand, migrate, contract for renames; rollback is redeploying code, not reversing DDL (109).

**GraphQL**

- Dataloader batches per tick, one instance per request, so caching never leaks (79, 110).
- Push batching into SQL with `= ANY($1)` and `json_agg` when profiling blames the loader (110).
- Expected failures go in typed `userErrors`, unexpected ones in top-level `errors` (76).
- Non-null fields propagate failure upward, so a flaky vendor lookup nulls a whole task (75).
- Cost-based limiting, not request counting, stops alias abuse and deep fan-out (79).

**Integrations**

- At-least-once delivery needs idempotent handlers; a unique constraint wins the race (105).
- Retry only what is safe, with exponential backoff and full jitter, honoring `Retry-After` (105).
- OAuth authorizes a request, OIDC proves identity; an ID token is not a bearer credential (72).
- Per-org rate limits stop one vendor's buggy script degrading the program (112).
- Third-party tokens stay server side; the browser gets only an `HttpOnly` cookie (69, 70).

**CI/CD**

- `pull_request_target` plus checking out fork code leaks your deploy credentials (92).
- OIDC replaces long-lived cloud keys with a token minted per job run (92).
- Run GraphQL codegen with `--check` in CI so stale types fail the build (78).
- Two-tier static caching: hashed assets forever, `index.html` revalidated each load (89).
- Deploy previews are unauthenticated by default, which leaks partner data (89).

## Pitfalls to avoid

- Jumping to WebSockets before establishing who the users are (112).
- Making context the default sharing mechanism, then memoizing every consumer (05).
- Assuming everything after an `await` in a transition keeps transition priority (08).
- Optimistically updating data another company controls, with no snapshot to roll back (15, 77).
- Saying "just enable CORS"; reflecting `Origin` with credentials opens the API to everyone (65).
- Calling JWTs stateless without naming the revocation cost at vendor offboarding (71).
- Rate limiting GraphQL by request count, useless against aliased expensive fields (79).
- Describing CI/CD as "make tests green" without saying who can deploy (92).

## Three stories to have ready

**1. A data-visibility concern you raised** (115). S: the feature and whose data was exposed. T: what you owned. A: what you checked and changed. R: rows or roles affected. Reflection: what you would check earlier now.

**2. A time you cut scope** (115). S: the deadline and the ask. T: your call. A: the smaller reversible slice, who you told, how early. R: the ship date. Reflection: what you would say sooner.

**3. Onboarding to an unfamiliar stack fast** (115). The Go-in-a-week story goes here. S: no Go, a real deadline. T: ship something working. A: the service, the middleware, the tests. R: what runs now. Reflection: what you would learn first next time.

Say "I", not "we". Ninety seconds: 15 context, 45 action, 20 result with a number, 10 reflection (115).

## Questions to ask them

1. How do vendors and customers see different views of one program, and where does that logic live?
2. What breaks, technically or socially, when two companies edit the same schedule at once?
3. What does "own it" mean at 2 a.m.: an escalation path, or the only line?
4. What does the on-call rotation look like, who is on it, and what gets paged?
5. Walk me through how a change gets from an opened PR to production.
6. How do product decisions get made, and are engineers in the room for prioritization?

Listen for recent specifics and a sustainable rotation. Red flags: "we don't really have outages", ownership framed only as blame, no example of engineering pushing back.

## Honest gaps and how to frame them

- **Go is new.** Say it plainly, then give evidence: "I built a Go service this month on the 1.22 mux, with recovery middleware and `httptest` tests. The hard part was errors as values."
- **Apollo is theory only.** "I have read the cache model, not shipped it. I can trace why a rename updates every screen but a created task needs `cache.modify`."
- **No defense background.** Name the requirements instead: audit history as first-class schema, tenant isolation as its own CI suite, revocation over token convenience. The domain is new, the constraints are familiar.
