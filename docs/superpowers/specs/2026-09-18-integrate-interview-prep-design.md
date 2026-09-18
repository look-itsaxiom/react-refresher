# Integrate interview prep: design

Date: 2026-09-18. Status: design approved in conversation; spec pending review.

## Goal

Tailor React Refresher so it prepares Chase for a Full Stack Software Engineer interview at
Integrate (Seattle; multiplayer project-management software for deep-tech hardware programs).
Stack in the posting: React, Go (REST, middleware, service patterns), GraphQL (resolvers, n+1,
Apollo Client a plus), PostgreSQL (schema design, queries, migrations), GitHub Actions, Tailwind,
plus webhooks and third-party integrations, caching, rate limiting, async processing. Small team,
ownership culture, product thinking expected.

Chase's self-assessment: Go little or none; PostgreSQL comfortable; GraphQL/Apollo theory only.
No interview date yet, so the work becomes a durable part of the course rather than a cram sheet.

## Non-goals

- No hosted deployment; the course stays local-first.
- No attempt to run Go in the browser.
- No flashcard or spaced-repetition mode.
- No changes to the 101 existing lessons beyond an appended "Interview angle" section.

## Architecture overview

Three additions to the framework, then content on top of them:

1. **Local exercises** (`runtime: 'local'`): Go exercises live in `exercises-local/<lesson>/<step>/`
   as real Go modules. The dev server grades them by running `go test -json` and streaming the
   result to the app. Nothing runs in the browser sandbox.
2. **SQL exercises** (`runtime: 'sql'`): PostgreSQL exercises run on PGlite (Postgres compiled to
   WebAssembly, `@electric-sql/pglite`), lazily loaded in the preview iframe and in Node for the
   validation suite. Checks query the database and can inspect `EXPLAIN` output.
3. **Paths**: a `src/content/paths.ts` module defines ordered study plans across lessons; the
   dashboard shows a path card with its own progress, and lessons in a path show a badge.

Existing browser exercises are unchanged (`runtime` defaults to `'browser'`).

## Content model changes (`src/content/types.ts`)

```ts
export type ExerciseRuntime = 'browser' | 'sql' | 'local';

export type ExerciseStep = {
  kind: 'exercise';
  id: string;
  title: string;
  prompt: string;
  files: Record<string, string>;      // browser + sql: starter files. local: read-only listing for display
  solution: Record<string, string>;   // browser + sql: solution files. local: solution files (display only)
  hints: string[];
  checks: Check[];                    // browser + sql. local: [] (grading comes from `go test`)
  entry?: string;
  runtime?: ExerciseRuntime;          // default 'browser'
  local?: { dir: string; command: string; expectedTests: string[] }; // runtime 'local' only
};
```

`CheckContext` gains an optional `db` for SQL exercises:

```ts
export type SqlDb = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
  explain(sql: string): Promise<string[]>; // EXPLAIN (FORMAT TEXT) lines
};
// CheckContext: readonly db: SqlDb  (only defined when runtime === 'sql')
```

SQL exercise files are `starter.sql`, `solution.sql`, and an optional `seed.sql` (schema and data
loaded before the learner's SQL runs). The learner's file is executed as a script against a fresh
database for every check; `ctx.mod` is not available in SQL exercises.

New track ids: `'go' | 'postgres' | 'interview'`. The existing `'graphql'` track receives two more
lessons.

## Local exercise runner

- Layout: `exercises-local/<lesson-id>/<step-id>/` containing `go.mod`, one or more `*.go` files
  with TODOs, `*_test.go` with failing tests, and `solution/` holding the reference implementation
  behind the build tag `//go:build solution` so `go test ./...` ignores it by default and
  `go test -tags solution ./...` proves the solution passes.
- Dev server endpoint: `POST /__local-check` with body `{ "dir": "<lesson-id>/<step-id>" }`.
  The plugin (`vite-plugin-local-check.ts`) resolves the directory strictly under
  `exercises-local/`, rejects anything with `..` or absolute segments, rejects requests whose
  Origin/Host are not the dev server (same rule as the progress plugin), and spawns
  `go test -json -count=1 ./...` with a 60 second timeout and kills the process on timeout.
  Response: `{ ok: boolean; tests: Array<{ name; status: 'pass'|'fail'|'skip'; output: string }>;
  raw: string; durationMs: number; error?: string }`. If `go` is not on PATH, the response is
  `{ ok: false, error: 'go-not-found' }` and the UI shows install instructions.
- App: `LocalExerciseStep` view shows the prompt, the read-only starter listing, the exact folder
  path and command to run manually, a "Run go test" button that calls the endpoint and renders per
  test results, hints, and the solution (collapsed). Passing all `expectedTests` marks the step
  complete through the existing progress store. In a static build (no dev server) the button is
  replaced by "run this in your terminal" plus a manual "Mark complete".
- Validation: `src/content/__tests__/local-exercises.test.ts` runs, for every local exercise,
  `go test ./...` (expect failures in the starter) and `go test -tags solution ./...` (expect
  pass), skipping with a clear message when `go` is not installed. `go vet` runs on both.

## SQL runtime (PGlite)

- `src/sandbox/sql/db.ts` wraps PGlite behind the `SqlDb` interface; `createSqlDb()` boots a
  fresh in-memory instance. In the browser it is loaded with a dynamic import so the wasm (about
  3 MB compressed) is fetched only when a SQL exercise opens; in Node the same import works.
- `src/sandbox/sql/runSqlChecks.ts` mirrors `runChecks`: for each check, create a fresh db, run
  `seed.sql` if present, run the learner's SQL as a script (statement by statement, stopping at
  the first error, which becomes a check failure), then run the check with `ctx.db`. A 10 second
  watchdog per check.
- Editor: add `@codemirror/lang-sql` with the PostgreSQL dialect. The preview pane for SQL
  exercises shows the result grid of the last statement plus any error, refreshed on Run.
- Sucrase is not involved; there is no `mod`.

## Paths

```ts
export type PathStop = { lessonId: string; why: string; optional?: boolean };
export type Path = { id: string; title: string; description: string; stops: PathStop[] };
```

`paths.ts` defines `integrate-fullstack`. The dashboard renders a card per path: title,
description, progress bar computed from the existing per-step progress of its stops, and a
"Continue" link to the first incomplete stop. `LessonPage` shows a small badge "On your Integrate
path" with the stop note. `getCurriculumView` is unchanged; a new `getPathView(pathId)` composes it.

## New lessons (curriculum order; ids continue from 101)

Track `go` (local exercises; concept steps still teach with code blocks):
- 102 Go for TypeScript developers: syntax and types, structs and interfaces, errors as values,
  slices and maps, packages and modules, goroutines and channels basics, tooling (`go test`,
  `go vet`, gofmt). Exercise: implement a small package with table-driven tests.
- 103 HTTP services in Go: `net/http` with Go 1.22+ method and path patterns, handlers and
  `http.Handler`, middleware chains, `context` for deadlines and request values, JSON encoding and
  validation, error responses, `httptest`. Exercise: build a tasks API with middleware and tests.
- 104 Go service patterns: project layout, dependency injection through structs, error wrapping and
  sentinel errors, context cancellation and timeouts, worker pools, graceful shutdown, `slog`,
  configuration. Exercise: a background worker with cancellation and a race-free counter
  (`go test -race`).
- 105 Integrations in Go: webhook receivers (signature verification, replay protection,
  idempotency keys), outbound clients with retries and backoff, rate limiting (token bucket),
  async processing with a queue and at-least-once semantics, observability of the contract.
  Exercise: a webhook receiver plus an idempotent processor.

Track `postgres` (SQL exercises on PGlite):
- 106 Schema design for cross-organization project data: organizations, memberships, projects,
  tasks, dependencies, vendors and sharing across companies; keys, constraints, enums vs lookup
  tables, soft deletes, audit columns, multi-tenant patterns. Exercise: write the schema to satisfy
  constraint checks.
- 107 Queries that answer product questions: joins, CTEs, window functions, aggregation, recursive
  CTEs for task hierarchies and dependency graphs (critical path), `LATERAL`, `jsonb`. Exercise:
  write queries graded by result sets.
- 108 Indexes and `EXPLAIN`: btree, composite and column order, partial, covering, GIN for `jsonb`
  and full-text search; reading plans; the database side of n+1. Exercise: add indexes so given
  queries stop sequential-scanning (graded via `EXPLAIN`).
- 109 Migrations and schema evolution: expand/contract, zero-downtime changes, backfills in
  batches, locks and `CONCURRENTLY`, tools (golang-migrate, goose, Atlas), transactions.
  Exercise: write a migration sequence that keeps a running query valid at each step.

Track `graphql` (extension):
- 110 GraphQL servers in Go: gqlgen schema-first workflow, resolvers, dataloaders for n+1,
  complexity limits, auth in context, error handling. Local exercise: resolvers with a dataloader
  under a query-count test.
- 111 Apollo Client in React: normalized cache and `typePolicies`, fragments, `useQuery` and
  `useMutation`, optimistic responses and cache updates, pagination, subscriptions, codegen.
  Browser exercise: a miniature of Apollo's cache behaviour (the real client is not importable).

Track `interview`:
- 112 System design: cross-organization collaboration. Permissions across companies, real-time
  updates (SSE vs WebSocket vs GraphQL subscriptions), conflict handling, audit and history,
  data model for shared programs. Exercise: a structured design worksheet graded by a rubric
  checklist (self-assessed items plus objective checks on the data model).
- 113 Live-coding drills for project UIs: timeboxed React exercises (dependency list with
  cycle detection, large virtualized task table, optimistic status edits with rollback), each
  with a 25-minute target. Browser exercises.
- 114 Take-home rehearsal: a local template under `exercises-local/114-take-home/` with a Go API,
  Postgres schema (docker-compose), React UI, and a GitHub Actions workflow, plus a checklist of
  what reviewers look for. Local exercise graded by `go test` and a checklist.
- 115 Product thinking and ownership on a small team: how to talk about tradeoffs, pushing back
  on specs, UX polish as an engineering requirement, incident stories, questions to ask
  Integrate. Quiz-only lesson plus a written-answer worksheet.

## Tailoring existing lessons

Append a `## Interview angle` section (150 to 300 words) to the last concept step of these
lessons: 02, 08, 09, 15, 54 (React state and performance); 18, 28, 94, 95 (Tailwind and CSS);
75, 76, 77, 78, 79 (GraphQL); 65, 66, 69, 70, 71, 72 (CORS, CSRF, auth); 89, 90, 91, 92, 93
(deployment and GitHub Actions); 52 (caching). Each section states what a strong answer sounds
like for this role, one likely follow-up question, and one pitfall.

## Testing

- Unit tests for the local-check plugin (path validation, origin check, timeout, go-not-found).
- Unit tests for the SQL db wrapper and `runSqlChecks` (fresh db per check, seed applied,
  statement error becomes failure, watchdog).
- `solutions.test.ts` extended to SQL exercises (solution passes, starter fails, hints present).
- `local-exercises.test.ts` as described above.
- Paths: test that every stop id exists in the curriculum and progress rolls up correctly.
- Existing suites stay green; `pnpm typecheck` clean.

## Rollout

1. Framework: types, PGlite runtime and SQL step UI, local runner plugin and step UI, paths and
   dashboard card, tests. One subagent-driven build session on a feature branch, merged to main.
2. Content: lessons 102 to 115 in authoring runs of four, following `docs/authoring-runbook.md`
   with an extended "Sandbox constraints" section for `sql` and `local` runtimes.
3. Tailoring: one batch run appending "Interview angle" sections to the 26 listed lessons.
4. Path definition committed with the content.

## Risks

- PGlite adds a large dependency; mitigated by lazy loading and keeping it out of the main bundle.
- `go test` on Windows can be slow on first compile; the UI shows a running state and the plugin
  timeout is 60 seconds.
- Facts about Go, gqlgen, and Apollo must be verified against primary docs; authors hedge or omit
  what they cannot verify, as before.
