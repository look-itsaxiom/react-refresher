# Frame the problem like an interviewer wants

You've done component design interviews. A cross-org system design interview is a different
game: nobody cares whether you know `useSyncExternalStore`. They care whether you can take a
one-sentence prompt — "design a project management tool that a customer and its vendors
share" — and produce a data model, an authorization scheme, and an API surface that doesn't
fall over at the boundary between two companies. This lesson (and the two after it) prepare
you for exactly that prompt at a company like Integrate, where the whole product is
"multiplayer" across organizations building hardware programs: a customer, its vendors, and
its partners, all editing one program, none of them able to see everything the others see.

## Requirements gathering, out loud

A senior candidate narrates the requirements pass before touching a whiteboard. For this
domain, that pass looks like:

- **Who.** A customer PM who owns the program. Vendor engineers who own their scope of work
  inside it. Partner QA who needs read access to a slice plus write access to test results.
  Every one of these people works for a different legal entity, has their own login, and
  should never see another company's internal notes by accident.
- **What.** Tasks, dependencies between tasks, schedules, documents, comments, status
  changes — the same nouns as [lesson 106](../106-schema-design-for-project-data/01-modeling-the-domain.md)'s
  schema: organizations, memberships, projects (here, "programs"), project shares, tasks,
  task dependencies.
- **Scale, roughly.** Hundreds of organizations, thousands of programs, tens of thousands of
  tasks in a single large program, and — the number that actually shapes the design —
  hundreds of people concurrently viewing and editing one program during a live review. That
  last number is why this isn't just a CRUD app with row-level filtering; it's why "real
  time" shows up in the next concept step at all.
- **Non-functional pressure.** Aerospace and advanced-manufacturing customers bring
  compliance requirements: who saw what, who changed what, and proof of both, often for
  years. That pulls audit history from "nice to have" to a first-class part of the schema,
  not an afterthought bolted on with a logging library.

State these out loud before you draw a single box. An interviewer watching you jump straight
to "I'd use WebSockets" without first establishing who the users are and what they need to
see is watching someone who has memorized a pattern instead of reasoning about a problem.

## The data model: multi-tenant, but sharing is the point

The naive shape — one `org_id` column, every row belongs to exactly one tenant, done — fails
immediately here, because the product's entire value proposition is that a row can be
legitimately visible to more than one organization. [Lesson 106](../106-schema-design-for-project-data/01-modeling-the-domain.md)
already built the schema for this: `organizations`, `memberships` (user × org, with a role),
`projects` (owned by exactly one org), `project_shares` (a project shared to another org, at
a role), `tasks`, `task_dependencies`. The one addition this lesson's exercises make
explicit is **need-to-know visibility**: a task can be `program`-visible (anyone who can see
the program sees it — a status, a due date, a dependency edge) or `org-internal` (only
people who work for the task's owning org see it — the vendor's internal cost notes, the
customer's private risk assessment). A vendor engineer should see that a customer's task is
blocking theirs, and its status, without seeing the customer's internal comment thread on
that task. Model that as a `visibility` flag on the row plus a filter, not as two separate
copies of the task — the second exercise's `visibleTasks` builds exactly that filter.

## Permissions across companies: RBAC times ReBAC

Inside one organization, role-based access control (RBAC) is enough: "editor", "viewer",
"admin", checked against a membership row. The moment a resource crosses an org boundary,
RBAC alone can't express "vendor engineers can edit their own tasks and view the tasks that
block them, but not the customer's internal notes" — that's a relationship between a
specific user, a specific organization, and a specific program, not a role that exists in
isolation.

The industry answer, since Google published the **Zanzibar** paper in 2019, is
**relationship-based access control (ReBAC)**: authorization decisions are computed from a
graph of relationship tuples rather than a fixed role table. A tuple looks like
`(object, relation, subject)` — `program:1#viewer@user:7`, or a subject that is itself a
userset, `program:1#viewer@org:2#member` ("anyone who is a member of org 2 is a viewer of
program 1"). A `check(user, action, resource)` call resolves whether a tuple — direct, or
implied through a chain of relations — grants that access. Two open-source systems built
directly on this model, **SpiceDB** and **OpenFGA**, are the concrete things to name in an
interview if asked "how would you actually build this" rather than "what's the theory" —
hedge on their exact current feature set if you haven't used one recently, but the shape
(a schema of relations, a tuple store, a `check` API) is stable across both.

This lesson's first exercise has you implement a small version of that `check` function
yourself: direct tuples, **unions** (an `editor` is also a `viewer` — the relation implies a
weaker one), **userset subjects** (a tuple whose subject is "members of org X", not one
concrete user), and **parent inheritance** (a program's `viewer` relation computed from
"members of any org related to this program via the `org` relation" — Zanzibar calls this a
tupleset-to-userset rewrite). Building it once makes the abstract description concrete: you
will feel exactly why cycle protection and a depth cap matter the moment you write a
userset that (accidentally, in the fixtures) refers back to itself.

The practical question underneath all of this: where does the check run? Options, roughly in
order of how most systems actually evolve:

| Approach | Where it filters | Strength | Weakness |
|---|---|---|---|
| Row-level filtering in SQL (`WHERE` against `project_shares`) | Database | Cheap, uses existing indexes, easy to reason about for one query shape | Every query needs the right join; easy to forget on a new endpoint |
| Postgres row-level security (RLS) | Database, enforced per-connection | Can't be bypassed by a forgotten `WHERE` clause | Policy logic lives in SQL, harder to unit test than application code; see [lesson 106](../106-schema-design-for-project-data/01-modeling-the-domain.md) and the security track (lessons 62–67) for the isolation-testing angle |
| A dedicated authorization service (Zanzibar-style) | Application layer, one `check()` call per decision | One source of truth, works the same for GraphQL, REST, and background jobs | Extra network hop per check unless you cache; the service itself becomes a hard dependency |

Most real systems at this scale use two of these together: RLS or a row filter as the
floor — the thing that holds even if application code has a bug — and a relationship service
as the actual decision-maker for anything more nuanced than "which org owns this row."
Caching matters here specifically because a check on the hot path (rendering a task list)
can't afford a network round trip per row; cache the decision per request, and invalidate
aggressively (or accept slightly stale reads) rather than caching across requests. Say this
tradeoff by name if asked: **consistency of permission changes vs. latency of permission
checks**. A revoked share that takes 30 seconds to take effect because of a cache is a real
security gap for a compliance-sensitive customer; a check that adds 50ms to every task-list
render because it hits the authorization service uncached is a real UX problem. There is no
version of this system that gets both for free — say which one you'd pick for a hardware
compliance customer, and why (favor consistency: audit denials, minimize the cache window).

## API surface

A product like this typically runs two APIs side by side, not one:

- **GraphQL** for the product UI. Field-level auth matters more here than in a typical
  CRUD API, because a single query can request fields the requester shouldn't see — a
  `Task.internalNotes` field needs its own resolver-level check, not just a query-level one,
  or a vendor engineer's query for "my tasks" silently leaks a field meant only for the
  customer.
- **REST plus webhooks** for vendor integrations — a vendor's own tooling posting status
  updates, or receiving a webhook when a task they depend on changes state. [Lesson 105](../105-integrations-in-go/01-webhooks-and-idempotency.md)
  covers the mechanics (signatures, idempotency, retries) that this surface needs; the
  authorization question layered on top is the same `check()` call, just invoked from a
  webhook handler instead of a resolver.

## Further reading (optional)

- [Zanzibar: Google's Consistent, Global Authorization System (research.google, PDF)](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/)
- [OpenFGA documentation: Modeling Concepts](https://openfga.dev/docs/modeling/getting-started)
- [SpiceDB documentation: Schema](https://authzed.com/docs/spicedb/concepts/schema)
- [PostgreSQL documentation: Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
