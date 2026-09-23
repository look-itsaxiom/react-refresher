import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'schema-design-quiz',
  title: 'Quiz: Schema design for cross-organization project data',
  questions: [
    {
      id: 'restrict-vs-cascade-org-delete',
      prompt:
        "A teammate proposes `on delete cascade` from `projects.org_id` to `organizations.id`, reasoning \"it keeps things tidy — no orphaned projects.\" In this cross-organization system, what's wrong with that choice specifically for the organizations relationship?",
      choices: [
        { id: 'a', text: 'Nothing — cascade is always the safer default for any foreign key.' },
        {
          id: 'b',
          text:
            "Deleting an organization would silently delete every project it owns, and cascade from there through every task, dependency, and share on those projects — including data other organizations depend on through shares. That's a large, silent blast radius for one delete statement; restrict forces a human decision first.",
        },
        { id: 'c', text: 'Postgres does not allow cascade on a foreign key that is also referenced by a unique constraint.' },
        { id: 'd', text: 'Cascade would only delete the projects, never reach the tasks underneath them.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'ON DELETE is chosen per relationship based on blast radius and whether the referencing rows have meaning without the parent. Tasks have no meaning without their project (cascade is right there); an organization is not a throwaway parent of its projects the same way — deleting it should require an explicit decision about what happens to what it owns, especially once other organizations have shares into that data.',
    },
    {
      id: 'unique-with-soft-delete',
      prompt:
        "`projects` has `unique (org_id, name)` and a `deleted_at` column. A user soft-deletes a project named \"Q3 Rollout\" and immediately tries to create a new project with the same name in the same org. What happens, and why?",
      choices: [
        { id: 'a', text: 'It succeeds — soft-deleted rows are automatically excluded from unique constraints.' },
        {
          id: 'b',
          text:
            'It fails with a unique violation, because the plain unique constraint has no concept of "only among live rows" — the soft-deleted row still counts. Fixing this needs a partial unique index scoped to `where deleted_at is null`.',
        },
        { id: 'c', text: 'It succeeds, but the old soft-deleted row is silently overwritten.' },
        { id: 'd', text: 'It fails with a foreign key violation, not a unique violation.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A `unique` constraint compares all rows, deleted-in-spirit or not — Postgres has no idea `deleted_at is null` means "still counts." This is one of the most common gaps in schemas that add soft deletes after the fact: the uniqueness constraints that made sense before deletion existed silently stop doing what people assume.',
    },
    {
      id: 'enum-vs-lookup-table',
      prompt:
        "`task_status` is a Postgres enum. Product now wants each customer organization to be able to define its own custom statuses (beyond todo/doing/blocked/done) for their own projects. What does that requirement tell you about the enum choice?",
      choices: [
        { id: 'a', text: 'Nothing changes — enums support per-row custom values natively.' },
        {
          id: 'b',
          text:
            "A fixed enum can't represent per-tenant, user-defined values at all — every new status would need a schema migration (`alter type ... add value`), and there's still no per-tenant scoping. This is exactly the case for a lookup table (`statuses(org_id, code, label)`), which supports inserts instead of migrations and can scope values to a tenant.",
        },
        { id: 'c', text: 'Switch to a jsonb column instead, since jsonb accepts any value without constraints.' },
        { id: 'd', text: 'Enums already support tenant-scoped values via a hidden schema per organization.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is the concrete trigger for the enum-vs-lookup-table tradeoff: enums are cheap and fast when the value set is small, global, and rarely changes. The moment values need to be user-defined or tenant-scoped, a lookup table with a foreign key is the only one of the three approaches (enum, lookup table, text+check) that fits — dropping to jsonb loses referential integrity and gains you nothing here.",
    },
    {
      id: 'hierarchy-vs-graph',
      prompt:
        'A task can have a `parent_task_id` (a subtask relationship) and can also appear in `task_dependencies` (a "blocked by" relationship). A teammate suggests collapsing both into a single self-referencing `related_task_id` column to simplify the schema. What breaks?',
      choices: [
        { id: 'a', text: 'Nothing breaks — both relationships are the same shape, so one column covers both.' },
        {
          id: 'b',
          text:
            "A single self-referencing column can express a tree (each row has at most one parent) but not a graph where a task can have multiple predecessors and multiple successors. Dependencies need an edge table (`task_dependencies(predecessor_id, successor_id)`); collapsing it into one column would silently limit every task to a single dependency.",
        },
        { id: 'c', text: 'Postgres does not allow two self-referencing foreign keys on the same table.' },
        { id: 'd', text: "It breaks only if the table also has a check constraint, which neither relationship needs." },
      ],
      correctChoiceId: 'b',
      explanation:
        "A parent-task hierarchy is a tree: each row has at most one parent, so a single `parent_task_id` column is the right, minimal representation. A dependency graph is not a tree — a task routinely has more than one predecessor and more than one successor — so it needs its own edge table with a composite primary key, not a single column on `tasks`. Modeling a graph as a tree column loses real dependencies.",
    },
    {
      id: 'rls-vs-app-filtering',
      prompt:
        'A team enables row-level security on `projects` with a policy based on `current_setting(\'app.current_org_id\')`, then removes the `where org_id = ...` filter from their Go service\'s queries, reasoning the database now handles it. What could still go wrong?',
      choices: [
        { id: 'a', text: 'Nothing — RLS fully replaces application-level filtering once enabled.' },
        {
          id: 'b',
          text:
            "RLS only enforces the policy if `app.current_org_id` is actually set correctly on that connection before the query runs. If a connection pool reuses a session without resetting the setting, or a code path forgets to set it, the policy filters on stale or missing state — RLS is a second layer that depends on the application still doing its part, not a substitute for it.",
        },
        { id: 'c', text: 'RLS policies cannot reference session variables, only column values, so this policy would fail to create.' },
        { id: 'd', text: 'RLS only applies to SELECT statements, so INSERT and UPDATE would remain unprotected regardless.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "RLS is valuable exactly because it catches the query that forgot to filter — but it's only as reliable as the session state it reads. `SET LOCAL` inside each transaction, set correctly by the application on every request, is still required; a connection pool that doesn't reset `app.current_org_id` between borrowed connections (or a code path that never sets it) turns the policy into either a silent over-restriction or, worse, a wrong org's data leaking through a stale setting.",
    },
    {
      id: 'uuid-vs-identity-tradeoff',
      prompt:
        "Asked in an interview why a schema uses `uuid` primary keys instead of `bigint generated always as identity` for a system where a Go service, a queue consumer, and client-side optimistic inserts can all create new rows, what's the strongest justification?",
      choices: [
        { id: 'a', text: '"UUIDs are the modern standard and look more professional in a REST API."' },
        {
          id: 'b',
          text:
            '"Multiple independent writers need to generate ids before the row is durably inserted — a client doing an optimistic insert, or a queue consumer processing out of order — and a single Postgres sequence can\'t hand out non-colliding values to writers that aren\'t all talking to the same database at insert time. UUIDs can be generated anywhere without coordination."',
        },
        { id: 'c', text: '"bigint identity columns cannot be referenced by foreign keys, so uuid is required."' },
        { id: 'd', text: '"UUIDs are always faster to index than bigints, regardless of write pattern."' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The real tradeoff is about who needs to generate the id and when. A single-writer system with no need for client-side id generation gets smaller, sequential, better-indexing bigints for free with `generated always as identity`. Once more than one process needs to mint an id before a row exists in the database — exactly the shape of a multiplayer, multi-service system — a globally unique, coordination-free scheme like `gen_random_uuid()` earns its cost. 'Looks modern' and 'always faster' are not real justifications and would read as a weak answer in an interview.",
    },
  ],
};
