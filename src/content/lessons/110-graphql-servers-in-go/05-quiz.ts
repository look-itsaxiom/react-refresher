import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'graphql-servers-in-go-quiz',
  title: 'Quiz: GraphQL servers in Go',
  questions: [
    {
      id: 'dataloader-cache-lifetime',
      prompt:
        'A teammate proposes making the dataloaders for a gqlgen service package-level singletons, built once at startup, instead of constructing a fresh Loaders struct per incoming request. What breaks?',
      choices: [
        { id: 'a', text: "Nothing breaks -- singletons just mean fewer allocations, which is strictly better." },
        {
          id: 'b',
          text:
            "A loader's cache would live across requests from different users. Since the cache is keyed only by entity ID, one user's resolved User/Task/Project data would be served to a completely different (and possibly cross-organization) request that happens to ask for the same ID, bypassing whatever per-request authorization the resolver layer thinks it's enforcing.",
        },
        { id: 'c', text: 'gqlgen refuses to start if a Loaders value is constructed inside a middleware, so this would fail at boot.' },
        { id: 'd', text: "Package-level loaders would cause a Go compile error because generics can't be package-level variables." },
      ],
      correctChoiceId: 'b',
      explanation:
        "A dataloader's cache is a correctness boundary, not just a performance one: it must be scoped to exactly one request so that data resolved for one caller can never leak into another's response. The fix is a loader built fresh per request (typically in the same middleware that attaches the request's principal to context) and discarded when the request finishes.",
    },
    {
      id: 'batching-vs-sql',
      prompt:
        "A `Tasks` dataloader's batch function is already collapsing N `TasksByProjectIDs` calls into 1, but a profiler shows most of that one call's time is spent in Go, grouping thousands of rows into a `map[string][]Task]` after a single flat SQL query returns them. What's the next lever, and why?",
      choices: [
        {
          id: 'a',
          text: 'Increase maxBatch so more project IDs are collected per group -- that reduces the number of SQL round trips further.',
        },
        {
          id: 'b',
          text:
            'Push the grouping into the query itself -- e.g. `json_agg(task) ... GROUP BY project_id` -- so Postgres returns one row per project with its tasks pre-aggregated, and the Go side just decodes the JSON instead of building the map by hand. The round-trip count was already at its floor (one call); the remaining cost is CPU-bound grouping work that the database can do as part of the same query.',
        },
        { id: 'c', text: 'Switch from a map-based batch result to a slice-based one, since maps are always slower than slices in Go.' },
        { id: 'd', text: 'Nothing more to do -- 1 round trip per level is the theoretical minimum, so remaining time is unavoidable.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Dataloader batching optimizes round trips, not necessarily the work done per round trip. Once you're at one call per level, a CPU-bound grouping step is a signal to move the grouping into SQL (json_agg, or a LATERAL join) rather than to keep tuning the loader -- the loader already did its job.",
    },
    {
      id: 'directive-vs-store-auth',
      prompt:
        'A `Task.internalNotes` field is gated by `@auth(requires: ADMIN)` in the schema, enforced by a gqlgen directive. A teammate says this means the resolver layer is now safe from cross-organization data leaks. Is that right?',
      choices: [
        { id: 'a', text: 'Yes -- a field-level directive is the standard, sufficient way to enforce all authorization in a GraphQL API.' },
        {
          id: 'b',
          text:
            "No. The directive only answers \"is this principal allowed to resolve this field at all\" -- it says nothing about which rows a query can see. If `TasksByProjectIDs` doesn't filter by the caller's org_id in the store itself, an admin from Org A can still fetch (and, per the directive, legitimately see internalNotes on) a task belonging to Org B just by guessing or enumerating its ID.",
        },
        { id: 'c', text: 'Yes, because gqlgen directives automatically inject a WHERE org_id = ? clause into every store call beneath the field.' },
        { id: 'd', text: "No, because gqlgen directives can only be applied to Query and Mutation root fields, never nested fields like Task.internalNotes." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Field-level directive auth and store-level row filtering answer different questions and both are required: the directive controls whether a field resolves at all for this caller, the store's WHERE clause controls which rows exist for this caller to ask about in the first place. Dropping either one leaves a real gap.",
    },
    {
      id: 'complexity-vs-timeout',
      prompt:
        'A service already has a 5-second request timeout on every handler. A teammate argues that\'s enough protection against an expensive query, so a complexity limit (`extension.FixedComplexityLimit`) would be redundant. What does a complexity limit catch that a timeout does not?',
      choices: [
        {
          id: 'a',
          text: 'Nothing -- a timeout that eventually fires bounds resource usage exactly as well as a pre-execution complexity check.',
        },
        {
          id: 'b',
          text:
            "A timeout only cuts a query off after it's already running and has already consumed resources -- memory for partially-built results, connections held open, downstream calls already fired. A complexity limit rejects the query *before execution starts*, based on its shape (nesting and list-size arguments), so a query engineered to be maximally expensive (deeply nested lists with large `first` values) never starts consuming those resources at all.",
        },
        { id: 'c', text: 'A complexity limit is only useful for mutations, since queries are inherently safe due to being read-only.' },
        { id: 'd', text: "Complexity limits and timeouts solve the exact same problem, so only one is ever needed in production." },
      ],
      correctChoiceId: 'b',
      explanation:
        'Timeouts and complexity limits guard against different failure shapes: a timeout is about wall-clock duration once work is underway, a complexity limit is about refusing to start work whose shape is already known to be excessive -- memory pressure, a fan-out of downstream calls, or database load can all happen well within a 5-second window.',
    },
    {
      id: 'field-resolver-vs-default',
      prompt:
        "In a gqlgen schema, `Task.title` needs no custom resolver (it maps straight onto the generated struct's `Title` field), but `Task.assignee` does. Why does `assignee` specifically need one, and what would happen if you implemented it by eagerly loading every task's assignee inside the `Task` resolver that builds the parent object, instead of as its own lazy field resolver?",
      choices: [
        {
          id: 'a',
          text: "There's no real difference -- eagerly loading assignee inside the parent resolver and lazily resolving it as its own field are functionally and performance-wise identical.",
        },
        {
          id: 'b',
          text:
            'assignee needs its own resolver because the value (a full User) is not already sitting on the Task struct the way Title is -- it has to be fetched. Eagerly loading it inside the parent Task resolver means every query pays that cost even when assignee was never selected, defeating GraphQL\'s "only pay for what you ask for" model; as its own field resolver, it only runs (and only then goes through a dataloader) when a query actually selects assignee.',
        },
        { id: 'c', text: 'Eagerly loading it in the parent resolver would cause a gqlgen compile-time error, so there is no real choice to make.' },
        { id: 'd', text: 'assignee needs its own resolver only because User is an interface type in the schema, which always forces a separate resolver.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A field resolver exists so a value that has to be computed or fetched is only computed when a client's selection set actually asks for it. Pulling that work into the parent resolver -- fetching every task's assignee whether or not the query selects it -- reintroduces the over-fetching GraphQL is supposed to eliminate, and does it silently, since nothing in the schema signals that Task now always does extra work.",
    },
    {
      id: 'per-request-loader-goroutines',
      prompt:
        'Your exercise\'s `ResolveProjects` starts a goroutine per project to load that project\'s tasks concurrently, then loops over each project\'s tasks sequentially (no goroutine per task) to load assignees. Despite the assignee loads not being individually concurrent within a project, the Users loader still ends up batching most of them into one call. Why?',
      choices: [
        { id: 'a', text: "It doesn't, actually -- each project's sequential assignee loads always land in separate batches from every other project's." },
        {
          id: 'b',
          text:
            "Every project's goroutine reaches its assignee-loading loop at roughly the same time, because they all started from the same Tasks-loader batch flush finishing together. Even though each individual goroutine loads its own tasks' assignees one at a time, those per-project sequences overlap in time *across* goroutines, so their Load calls still arrive within the Users loader's collection window and get grouped into one batch.",
        },
        { id: 'c', text: 'The Loader type silently ignores the wait duration for the Users loader specifically, and always waits for every project to finish before batching.' },
        { id: 'd', text: "It only works because Go's scheduler guarantees all goroutines execute in strict lockstep, one instruction at a time." },
      ],
      correctChoiceId: 'b',
      explanation:
        "A dataloader batches by arrival time within a window, not by which goroutine (or which \"level\" of a resolver tree) a Load call came from. Concurrency at the project level is enough to make the assignee-level batching work, because it's what gets multiple projects' worth of Load calls arriving close enough together in the first place -- you don't need every single Load call to be its own goroutine for batching to kick in.",
    },
  ],
};
