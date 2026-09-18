# Interview Prep Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two exercise runtimes (`sql` on PGlite, `local` graded by `go test` through the dev server), study paths on the dashboard, and the curriculum entries for lessons 102–115, so content authors can then write the Go, PostgreSQL, GraphQL-extension, and interview lessons.

**Architecture:** Browser exercises keep working unchanged (`runtime` defaults to `'browser'`). SQL exercises reuse the existing iframe and postMessage protocol: the preview host branches on `runtime` and runs the learner's SQL against a fresh PGlite database, posting a result grid for preview and `check-results` for checks. Local exercises bypass the iframe entirely: a new Vite dev-server plugin runs `go test -json` on an allowlisted folder and the step UI renders the parsed results. Paths are a pure content module composed over the existing curriculum view and progress store.

**Tech Stack:** React 19.3, TypeScript 7 (strict, `noUncheckedIndexedAccess`), Vite 8, Vitest 5 (jsdom by default; node environment where noted), `@electric-sql/pglite` 0.5.x, `@codemirror/lang-sql`, Go 1.25 (local only).

**Spec:** `docs/superpowers/specs/2026-09-18-integrate-interview-prep-design.md`

## Global Constraints

- `pnpm typecheck` and `pnpm test` must stay green after every task; existing lesson checks must not change behaviour.
- Runtime default is `'browser'`; no existing lesson file is edited except where a task names it.
- PGlite is loaded only through a dynamic `import()` in browser code so it stays out of the main bundle; Node tests may import it statically.
- `vite-plugin-local-check.ts` must not import from `src/` (it belongs to `tsconfig.node.json`, same as `vite-plugin-progress.ts`).
- The local-check endpoint accepts only POST, rejects any `dir` containing `..`, a leading `/` or `\`, or a drive letter, resolves strictly under `exercises-local/`, applies the same Origin/Host check as the progress plugin, and kills `go test` after 60 seconds.
- Commit after every task with a Conventional Commit message and the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Work on branch `feat/interview-prep-framework`; merge to `main` only after the final review.

---

### Task 1: Content types, curriculum entries, and registry test

**Files:**
- Modify: `src/content/types.ts`
- Modify: `src/content/curriculum.ts`
- Modify: `src/content/registry.test.ts`

**Interfaces:**
- Produces: `ExerciseRuntime`, `SqlDb`, `ExerciseStep.runtime`, `ExerciseStep.local`, `CheckContext.db`, `TrackId` additions `'go' | 'postgres' | 'interview'`, planned lessons `102-go-for-typescript-developers` … `115-product-thinking-and-ownership`.

- [ ] **Step 1: Extend the types**

In `src/content/types.ts`, add `'go' | 'postgres' | 'interview'` to the end of the `TrackId` union, then add after `ServerControls`:

```ts
export type ExerciseRuntime = 'browser' | 'sql' | 'local';

/** A fresh PostgreSQL database (PGlite) for SQL exercises. Present on ctx only when runtime === 'sql'. */
export type SqlDb = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[]; columns: string[] }>;
  /** Runs a multi-statement script. Throws on the first failing statement. */
  exec(sql: string): Promise<void>;
  /** `EXPLAIN (FORMAT TEXT)` lines for a query. */
  explain(sql: string): Promise<string[]>;
  close(): Promise<void>;
};

export type LocalExerciseConfig = {
  /** Folder under exercises-local/, e.g. '102-go-for-typescript-developers/02-table-driven-tests'. */
  dir: string;
  /** Shown to the learner as the manual command, e.g. 'go test ./...'. */
  command: string;
  /** `go test -json` test names that must all pass for the step to complete. */
  expectedTests: string[];
};
```

Add to `CheckContext` (after `sleep`):

```ts
  /** Fresh database for this check. Only defined for `runtime: 'sql'` exercises. */
  readonly db: SqlDb;
```

Add to `ExerciseStep` (after `entry?`):

```ts
  /** Where the learner's code runs. Defaults to 'browser'. */
  runtime?: ExerciseRuntime;
  /** Required when runtime === 'local'. */
  local?: LocalExerciseConfig;
```

- [ ] **Step 2: Add tracks and planned lessons**

In `src/content/curriculum.ts`, append to `tracks`:

```ts
  { id: 'go', title: 'Go for the backend', description: 'Go for TypeScript developers: HTTP services, service patterns, and integrations, graded by go test on your machine.' },
  { id: 'postgres', title: 'PostgreSQL in practice', description: 'Schema design, queries, indexes, and migrations for cross-organization project data, run on Postgres in the browser.' },
  { id: 'interview', title: 'Interview practice', description: 'System design, timed live-coding drills, a take-home rehearsal, and product thinking for a small full-stack team.' },
```

Append to `curriculum` (after lesson 101):

```ts
  // ---- Go
  { id: '102-go-for-typescript-developers', track: 'go', title: 'Go for TypeScript developers', summary: 'Syntax and types, structs and interfaces, errors as values, slices and maps, goroutines, and the go tool.' },
  { id: '103-http-services-in-go', track: 'go', title: 'HTTP services in Go', summary: 'net/http routing patterns, handlers, middleware chains, context, JSON, error responses, and httptest.' },
  { id: '104-go-service-patterns', track: 'go', title: 'Go service patterns', summary: 'Project layout, dependency injection, error wrapping, cancellation, worker pools, graceful shutdown, and slog.' },
  { id: '105-integrations-in-go', track: 'go', title: 'Integrations in Go', summary: 'Webhook signatures and idempotency, retries and backoff, rate limiting, async queues, and observability of the contract.' },
  // ---- PostgreSQL
  { id: '106-schema-design-for-project-data', track: 'postgres', title: 'Schema design for cross-organization project data', summary: 'Organizations, projects, tasks, dependencies, and sharing across companies; constraints, enums, soft deletes, audit columns.' },
  { id: '107-queries-that-answer-product-questions', track: 'postgres', title: 'Queries that answer product questions', summary: 'Joins, CTEs, window functions, recursive CTEs for hierarchies and dependency graphs, LATERAL, and jsonb.' },
  { id: '108-indexes-and-explain', track: 'postgres', title: 'Indexes and EXPLAIN', summary: 'Btree, composite, partial, covering, and GIN indexes; reading plans; the database side of n+1.' },
  { id: '109-migrations-and-schema-evolution', track: 'postgres', title: 'Migrations and schema evolution', summary: 'Expand/contract, zero-downtime changes, batched backfills, locks and CONCURRENTLY, and migration tools.' },
  // ---- GraphQL extension
  { id: '110-graphql-servers-in-go', track: 'graphql', title: 'GraphQL servers in Go', summary: 'gqlgen schema-first workflow, resolvers, dataloaders for n+1, complexity limits, and auth in context.' },
  { id: '111-apollo-client-in-react', track: 'graphql', title: 'Apollo Client in React', summary: 'Normalized cache and typePolicies, fragments, useQuery and useMutation, optimistic updates, pagination, codegen.' },
  // ---- Interview practice
  { id: '112-system-design-cross-org-collaboration', track: 'interview', title: 'System design: cross-organization collaboration', summary: 'Permissions across companies, real-time updates, conflict handling, audit history, and the data model for shared programs.' },
  { id: '113-live-coding-drills', track: 'interview', title: 'Live-coding drills for project UIs', summary: 'Timeboxed React exercises: dependency lists with cycle detection, large task tables, optimistic edits with rollback.' },
  { id: '114-take-home-rehearsal', track: 'interview', title: 'Take-home rehearsal', summary: 'A Go API, Postgres schema, React UI, and GitHub Actions workflow template, with a reviewer checklist.' },
  { id: '115-product-thinking-and-ownership', track: 'interview', title: 'Product thinking and ownership', summary: 'Talking about tradeoffs, pushing back on specs, UX polish as an engineering requirement, and questions to ask.' },
```

- [ ] **Step 3: Run the registry tests to see the curriculum-view test fail**

Run: `pnpm vitest run src/content/registry.test.ts`
Expected: FAIL in "curriculum view has every track, one entry per planned lesson, and only authored lessons are available" only if it asserts that no locked lessons exist. Read the test; it asserts `available.length === getLessons().length` and that every entry is in the curriculum, so it should PASS. If it passes, continue.

- [ ] **Step 4: Add a test that the new lessons are locked, not missing**

Append to `src/content/registry.test.ts` inside the `describe`:

```ts
  it('planned lessons without a module appear as locked entries in their track', () => {
    const view = getCurriculumView();
    const go = view.find((v) => v.track.id === 'go');
    expect(go).toBeDefined();
    expect(go!.lessons.map((l) => l.planned.id)).toEqual([
      '102-go-for-typescript-developers',
      '103-http-services-in-go',
      '104-go-service-patterns',
      '105-integrations-in-go',
    ]);
    for (const l of go!.lessons) expect(l.lesson).toBeUndefined();
  });
```

- [ ] **Step 5: Run typecheck and tests**

Run: `pnpm typecheck && pnpm vitest run src/content/registry.test.ts`
Expected: PASS. Note: `CheckContext.db` is now required by the type, so `src/sandbox/runner.ts` will fail typecheck because its `ctx` literal lacks `db`. Fix it in `runner.ts` by adding a getter that throws:

```ts
        get db(): never {
          throw new Error('ctx.db is only available in SQL exercises (runtime: "sql")');
        },
```

Re-run typecheck until clean.

- [ ] **Step 6: Commit**

```bash
git add src/content/types.ts src/content/curriculum.ts src/content/registry.test.ts src/sandbox/runner.ts
git commit -m "feat(content): exercise runtimes, SqlDb context, and lessons 102-115 in the curriculum" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Paths module and dashboard path card

**Files:**
- Create: `src/content/paths.ts`
- Create: `src/content/paths.test.ts`
- Modify: `src/app/dashboard-status.ts`
- Modify: `src/app/dashboard-status.test.ts`
- Modify: `src/app/Dashboard.tsx`
- Modify: `src/app/LessonPage.tsx`

**Interfaces:**
- Consumes: `getLesson`, `getCurriculumView` from `src/content/registry.ts`; `Progress` from `src/app/progress/types.ts`; `lessonCompletion` from `dashboard-status.ts`.
- Produces: `type PathStop`, `type Path`, `paths: Path[]`, `getPath(id)`, `getPathView(id): PathView`, `pathCompletion(pathView, progress)`, `pathStopFor(lessonId)`.

- [ ] **Step 1: Write the failing paths test**

Create `src/content/paths.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getPath, getPathView, paths, pathStopFor } from './paths';
import { curriculum } from './curriculum';

describe('paths', () => {
  it('every stop references a planned lesson exactly once', () => {
    const planned = new Set(curriculum.map((p) => p.id));
    for (const path of paths) {
      const ids = path.stops.map((s) => s.lessonId);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(planned.has(id), `${path.id}: unknown lesson ${id}`).toBe(true);
    }
  });

  it('getPathView resolves authored and unauthored stops in order', () => {
    const view = getPathView('integrate-fullstack');
    expect(view.path.id).toBe('integrate-fullstack');
    expect(view.stops.length).toBe(getPath('integrate-fullstack')!.stops.length);
    const first = view.stops[0]!;
    expect(first.planned.id).toBe(first.stop.lessonId);
    expect(view.stops.some((s) => s.lesson === undefined)).toBe(true); // 102+ not authored yet
    expect(view.stops.some((s) => s.lesson !== undefined)).toBe(true);
  });

  it('pathStopFor finds the stop note for a lesson on a path', () => {
    expect(pathStopFor('75-graphql-fundamentals')?.path.id).toBe('integrate-fullstack');
    expect(pathStopFor('01-rendering-and-state')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/content/paths.test.ts`
Expected: FAIL with "Cannot find module './paths'".

- [ ] **Step 3: Create the paths module**

Create `src/content/paths.ts`:

```ts
import type { Lesson, PlannedLesson } from './types';
import { curriculum } from './curriculum';
import { getLesson } from './registry';

export type PathStop = { lessonId: string; why: string; optional?: boolean };
export type Path = { id: string; title: string; description: string; stops: PathStop[] };
export type PathStopView = { stop: PathStop; planned: PlannedLesson; lesson: Lesson | undefined };
export type PathView = { path: Path; stops: PathStopView[] };

export const paths: Path[] = [
  {
    id: 'integrate-fullstack',
    title: 'Integrate: full-stack interview path',
    description:
      'React, Go, GraphQL, PostgreSQL, GitHub Actions, and Tailwind, in the order a full-stack interview for a cross-organization project-management product tends to probe them.',
    stops: [
      { lessonId: '02-components-and-props', why: 'Component architecture is the first thing a React screen probes.' },
      { lessonId: '08-concurrent-rendering', why: 'Transitions and Suspense explain how a busy project UI stays responsive.' },
      { lessonId: '09-external-stores', why: 'State management questions usually end at useSyncExternalStore and store design.' },
      { lessonId: '15-server-state-tanstack-query', why: 'Server state, caching, and optimistic updates come up in every data-heavy product.' },
      { lessonId: '54-react-performance', why: 'Large task tables and dependency views live or die on render performance.' },
      { lessonId: '18-styling-in-2026', why: 'Tailwind is in their stack; know why utility-first scales and where it does not.' },
      { lessonId: '94-css-architecture', why: 'Clean responsive interfaces without a framework crutch means owning the cascade.' },
      { lessonId: '75-graphql-fundamentals', why: 'Resolvers, schemas, and the n+1 problem are named in the posting.' },
      { lessonId: '76-graphql-operations', why: 'Fragments, variables, and pagination shape how the React side consumes the graph.' },
      { lessonId: '77-graphql-clients', why: 'Normalized caches are the mental model behind Apollo Client.' },
      { lessonId: '111-apollo-client-in-react', why: 'Apollo Client familiarity is an explicit plus.' },
      { lessonId: '102-go-for-typescript-developers', why: 'Go is the backend language; start from what carries over from TypeScript.' },
      { lessonId: '103-http-services-in-go', why: 'REST API development, middleware, and service patterns in Go are core requirements.' },
      { lessonId: '104-go-service-patterns', why: 'Cancellation, worker pools, and graceful shutdown are what senior Go screens probe.' },
      { lessonId: '105-integrations-in-go', why: 'Webhooks, third-party APIs, rate limiting, and async processing are named in the posting.' },
      { lessonId: '110-graphql-servers-in-go', why: 'Their GraphQL layer is in Go; resolvers and dataloaders tie the two tracks together.' },
      { lessonId: '106-schema-design-for-project-data', why: 'Owning data models in PostgreSQL starts with a schema for shared programs.' },
      { lessonId: '107-queries-that-answer-product-questions', why: 'Hierarchies and dependency graphs are the shape of project data.' },
      { lessonId: '108-indexes-and-explain', why: 'Query optimization is listed explicitly; EXPLAIN is the interview tool.' },
      { lessonId: '109-migrations-and-schema-evolution', why: 'Migration management on a live product is a classic follow-up.' },
      { lessonId: '52-caching-strategies', why: 'Caching is named as a broader backend concern.' },
      { lessonId: '65-cors-explained', why: 'Cross-organization products hit CORS and origin questions early.', optional: true },
      { lessonId: '69-sessions-vs-tokens', why: 'Auth across companies and vendors needs a clear sessions-vs-tokens answer.', optional: true },
      { lessonId: '92-ci-cd-with-github-actions', why: 'Writing and maintaining GitHub Actions pipelines is a listed responsibility.' },
      { lessonId: '93-release-safety', why: 'Owning what you ship means flags, rollbacks, and observability.' },
      { lessonId: '112-system-design-cross-org-collaboration', why: 'The system-design round, framed around their product.' },
      { lessonId: '113-live-coding-drills', why: 'Timed React drills on project-data UIs.' },
      { lessonId: '114-take-home-rehearsal', why: 'Rehearse the full stack end to end before a real take-home.' },
      { lessonId: '115-product-thinking-and-ownership', why: 'They want a full participant in product thinking, not an executor of specs.' },
    ],
  },
];

const plannedById = new Map(curriculum.map((p) => [p.id, p] as const));

export function getPath(id: string): Path | undefined {
  return paths.find((p) => p.id === id);
}

export function getPathView(id: string): PathView {
  const path = getPath(id);
  if (!path) throw new Error(`Unknown path '${id}'`);
  const stops: PathStopView[] = [];
  for (const stop of path.stops) {
    const planned = plannedById.get(stop.lessonId);
    if (!planned) throw new Error(`Path '${id}' references unknown lesson '${stop.lessonId}'`);
    stops.push({ stop, planned, lesson: getLesson(stop.lessonId) });
  }
  return { path, stops };
}

/** The first path that includes this lesson, with its stop note. */
export function pathStopFor(lessonId: string): { path: Path; stop: PathStop } | undefined {
  for (const path of paths) {
    const stop = path.stops.find((s) => s.lessonId === lessonId);
    if (stop) return { path, stop };
  }
  return undefined;
}
```

Check that every `lessonId` above exists in `curriculum.ts` (ids 02, 08, 09, 15, 18, 52, 54, 65, 69, 75, 76, 77, 92, 93, 94 are existing lessons; confirm their exact ids with `ls src/content/lessons` and correct any mismatch, e.g. lesson 02's folder name).

- [ ] **Step 4: Run the paths test**

Run: `pnpm vitest run src/content/paths.test.ts`
Expected: PASS.

- [ ] **Step 5: Add path completion to dashboard-status with a test**

Append to `src/app/dashboard-status.test.ts` (read the file first to match its fixture style):

```ts
import { pathCompletion } from './dashboard-status';
import { getPathView } from '../content/paths';
import { emptyProgress } from './progress/types';

describe('pathCompletion', () => {
  it('counts only authored stops and finds the first incomplete one', () => {
    const view = getPathView('integrate-fullstack');
    const empty = pathCompletion(view, emptyProgress());
    expect(empty.done).toBe(0);
    expect(empty.total).toBeGreaterThan(0);
    expect(empty.authoredStops).toBeLessThan(view.stops.length);
    expect(empty.nextLessonId).toBe(view.stops.find((s) => s.lesson)!.planned.id);
  });
});
```

Append to `src/app/dashboard-status.ts`:

```ts
import type { PathView } from '../content/paths';

export type PathCompletion = {
  done: number;
  total: number;
  percent: number;
  authoredStops: number;
  /** First authored stop that is not fully complete, or undefined when everything is done. */
  nextLessonId: string | undefined;
};

export function pathCompletion(view: PathView, progress: Progress): PathCompletion {
  let done = 0;
  let total = 0;
  let authoredStops = 0;
  let nextLessonId: string | undefined;
  for (const { lesson } of view.stops) {
    if (!lesson) continue;
    authoredStops++;
    const c = lessonCompletion(lesson, progress);
    done += c.done;
    total += c.total;
    if (nextLessonId === undefined && c.done < c.total) nextLessonId = lesson.id;
  }
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100), authoredStops, nextLessonId };
}
```

Run: `pnpm vitest run src/app/dashboard-status.test.ts`
Expected: PASS.

- [ ] **Step 6: Render path cards on the dashboard and a badge on lesson pages**

In `src/app/Dashboard.tsx`, import `getPathView, paths` from `'../content/paths'` and `pathCompletion` from `'./dashboard-status'`, and add this component above `Dashboard`:

```tsx
function PathCard({ pathId, progress }: { pathId: string; progress: Progress }) {
  const view = getPathView(pathId);
  const c = pathCompletion(view, progress);
  const next = c.nextLessonId ? getLesson(c.nextLessonId) : undefined;
  return (
    <section aria-labelledby={`path-${pathId}`} className="rounded-lg border border-accent/40 bg-surface-2 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`path-${pathId}`} className="text-lg font-semibold">{view.path.title}</h2>
          <p className="mt-1 text-sm text-ink-muted max-w-3xl">{view.path.description}</p>
        </div>
        {next && (
          <Link to={`/lesson/${next.id}/${firstIncompleteStepIndex(next, progress)}`}>
            <Button size="sm">Continue path</Button>
          </Link>
        )}
      </div>
      <div className="mt-3 h-1.5 rounded bg-surface-3 overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${c.percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        {c.done}/{c.total} steps across {c.authoredStops} of {view.stops.length} stops ({view.stops.length - c.authoredStops} coming soon)
      </p>
      <ol className="mt-3 flex flex-wrap gap-1.5">
        {view.stops.map(({ stop, planned, lesson }) => (
          <li key={stop.lessonId}>
            {lesson ? (
              <Link to={`/lesson/${lesson.id}/${firstIncompleteStepIndex(lesson, progress)}`} title={stop.why}
                className={`inline-block rounded px-2 py-0.5 text-xs border ${lessonStatus(lesson, progress) === 'done' ? 'border-success/40 text-success' : 'border-border text-ink hover:border-accent'}`}>
                {planned.title}
              </Link>
            ) : (
              <span title={stop.why} className="inline-block rounded px-2 py-0.5 text-xs border border-border text-ink-muted opacity-70">{planned.title}</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
```

Import `getLesson` from the registry alongside `getCurriculumView, getLessons`. In `Dashboard`'s JSX, after the header `<section>` and before the tracks, add:

```tsx
      {paths.map((p) => <PathCard key={p.id} pathId={p.id} progress={progress} />)}
```

In `src/app/LessonPage.tsx`, import `pathStopFor` from `'../content/paths'`, compute `const onPath = pathStopFor(lesson.id);` after the `if (!lesson || !step)` guard, and render inside the `<aside>` header block, after the `<h1>`:

```tsx
          {onPath && (
            <p className="mt-2 rounded border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-ink" title={onPath.stop.why}>
              On your path: {onPath.path.title.split(':')[0]}. {onPath.stop.why}
            </p>
          )}
```

- [ ] **Step 7: Typecheck, run the whole suite, and look at it**

Run: `pnpm typecheck && pnpm test`
Expected: PASS. Then open http://127.0.0.1:5180/ (start `pnpm dev` if needed) and confirm the path card renders above the tracks with a Continue button.

- [ ] **Step 8: Commit**

```bash
git add src/content/paths.ts src/content/paths.test.ts src/app/dashboard-status.ts src/app/dashboard-status.test.ts src/app/Dashboard.tsx src/app/LessonPage.tsx
git commit -m "feat(app): study paths with an Integrate full-stack path card and lesson badge" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: PGlite database wrapper

**Files:**
- Create: `src/sandbox/sql/db.ts`
- Create: `src/sandbox/sql/db.test.ts`
- Create: `src/sandbox/sql/split.ts`
- Create: `src/sandbox/sql/split.test.ts`
- Modify: `package.json` (dependency)

**Interfaces:**
- Consumes: `SqlDb` from `src/content/types.ts`.
- Produces: `createSqlDb(): Promise<SqlDb>`, `splitStatements(script: string): string[]`.

- [ ] **Step 1: Install PGlite**

Run: `pnpm add @electric-sql/pglite@^0.5.8`
Expected: package.json gains the dependency; lockfile updated.

- [ ] **Step 2: Write the statement splitter test**

Create `src/sandbox/sql/split.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { splitStatements } from './split';

describe('splitStatements', () => {
  it('splits on semicolons outside strings, comments, and dollar quotes', () => {
    const script = `
      -- a comment; with a semicolon
      create table t (id int, note text default 'a;b');
      insert into t values (1, $$x;y$$);
      /* block; comment */ select 1;
    `;
    expect(splitStatements(script)).toEqual([
      "create table t (id int, note text default 'a;b')",
      'insert into t values (1, $$x;y$$)',
      'select 1',
    ]);
  });

  it('keeps a trailing statement without a semicolon and drops empties', () => {
    expect(splitStatements('select 1;;  select 2')).toEqual(['select 1', 'select 2']);
    expect(splitStatements('   ')).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `pnpm vitest run src/sandbox/sql/split.test.ts`
Expected: FAIL with "Cannot find module './split'".

- [ ] **Step 4: Implement the splitter**

Create `src/sandbox/sql/split.ts`:

```ts
/**
 * Split a SQL script into statements. Handles single-quoted strings (with '' escapes),
 * double-quoted identifiers, line and block comments, and dollar-quoted strings ($$...$$ or $tag$...$tag$).
 * Comments are removed from the output; whitespace is trimmed; empty statements are dropped.
 */
export function splitStatements(script: string): string[] {
  const out: string[] = [];
  let buf = '';
  let i = 0;
  const n = script.length;
  while (i < n) {
    const ch = script[i]!;
    const next = script[i + 1];
    if (ch === '-' && next === '-') {
      while (i < n && script[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = script.indexOf('*/', i + 2);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (script[j] === ch) {
          if (ch === "'" && script[j + 1] === "'") { j += 2; continue; }
          break;
        }
        j++;
      }
      buf += script.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(script.slice(i));
      if (m) {
        const tag = m[0];
        const end = script.indexOf(tag, i + tag.length);
        const stop = end === -1 ? n : end + tag.length;
        buf += script.slice(i, stop);
        i = stop;
        continue;
      }
    }
    if (ch === ';') {
      const s = buf.trim();
      if (s) out.push(s);
      buf = '';
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  const last = buf.trim();
  if (last) out.push(last);
  return out;
}
```

- [ ] **Step 5: Run the splitter test**

Run: `pnpm vitest run src/sandbox/sql/split.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the db wrapper test (node environment)**

Create `src/sandbox/sql/db.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createSqlDb } from './db';

describe('createSqlDb (PGlite)', () => {
  it('runs a script, queries with params, returns columns, and explains', { timeout: 60_000 }, async () => {
    const db = await createSqlDb();
    try {
      await db.exec(`
        create table tasks (id serial primary key, title text not null, done boolean default false);
        insert into tasks (title) values ('a'), ('b');
      `);
      const r = await db.query<{ id: number; title: string }>('select id, title from tasks where title = $1', ['b']);
      expect(r.rows).toEqual([{ id: 2, title: 'b' }]);
      expect(r.columns).toEqual(['id', 'title']);
      const plan = await db.explain('select * from tasks where id = 1');
      expect(plan.join('\n')).toMatch(/Seq Scan|Index Scan|Index Only Scan/);
    } finally {
      await db.close();
    }
  });

  it('exec throws on the first failing statement and reports it', { timeout: 60_000 }, async () => {
    const db = await createSqlDb();
    try {
      await expect(db.exec('select 1; select from_nowhere; select 2')).rejects.toThrow(/from_nowhere|syntax/i);
    } finally {
      await db.close();
    }
  });

  it('two databases are independent', { timeout: 60_000 }, async () => {
    const a = await createSqlDb();
    const b = await createSqlDb();
    try {
      await a.exec('create table only_in_a (x int)');
      await expect(b.query('select * from only_in_a')).rejects.toThrow(/does not exist/);
    } finally {
      await a.close();
      await b.close();
    }
  });
});
```

- [ ] **Step 7: Run it to verify it fails**

Run: `pnpm vitest run src/sandbox/sql/db.test.ts`
Expected: FAIL with "Cannot find module './db'".

- [ ] **Step 8: Implement the wrapper**

Create `src/sandbox/sql/db.ts`:

```ts
import type { SqlDb } from '../../content/types';
import { splitStatements } from './split';

type PGliteLike = {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[]; fields: Array<{ name: string }> }>;
  close(): Promise<void>;
};

/**
 * Boot a fresh in-memory PostgreSQL (PGlite). The import is dynamic so the wasm bundle is
 * only fetched when a SQL exercise is opened in the browser; in Node it loads from node_modules.
 */
export async function createSqlDb(): Promise<SqlDb> {
  const { PGlite } = await import('@electric-sql/pglite');
  const pg = (await PGlite.create()) as unknown as PGliteLike;
  return {
    async query<T = Record<string, unknown>>(sql: string, params?: unknown[]) {
      const r = await pg.query<T>(sql, params);
      return { rows: r.rows, columns: r.fields.map((f) => f.name) };
    },
    async exec(sql: string) {
      for (const statement of splitStatements(sql)) {
        try {
          await pg.query(statement);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          throw new Error(`${message}\n  in statement: ${statement.length > 200 ? `${statement.slice(0, 200)}…` : statement}`);
        }
      }
    },
    async explain(sql: string) {
      const r = await pg.query<{ ['QUERY PLAN']: string }>(`explain (format text) ${sql}`);
      return r.rows.map((row) => row['QUERY PLAN']);
    },
    close: () => pg.close(),
  };
}
```

If `PGlite.create()` is not the constructor's static factory in 0.5.x, use `new PGlite()` followed by `await pg.waitReady`. Check `node_modules/@electric-sql/pglite/dist/index.d.ts` for the exact API and adjust `PGliteLike` accordingly; keep the wrapper's public shape unchanged.

- [ ] **Step 9: Run the db test**

Run: `pnpm vitest run src/sandbox/sql/db.test.ts`
Expected: PASS (first run may take a few seconds to load the wasm). If the test fails with a wasm or `fetch` error under Node, confirm the file has the `// @vitest-environment node` pragma on line 1 and that Node is 22+.

- [ ] **Step 10: Typecheck and commit**

Run: `pnpm typecheck`
Expected: clean.

```bash
git add package.json pnpm-lock.yaml src/sandbox/sql/db.ts src/sandbox/sql/db.test.ts src/sandbox/sql/split.ts src/sandbox/sql/split.test.ts
git commit -m "feat(sandbox): PGlite-backed SqlDb wrapper with statement splitting and explain" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: SQL check runner

**Files:**
- Create: `src/sandbox/sql/runSqlChecks.ts`
- Create: `src/sandbox/sql/runSqlChecks.test.ts`

**Interfaces:**
- Consumes: `createSqlDb` (Task 3), `Check`, `CheckContext`, `SqlDb` from types, `CheckResult` from `src/sandbox/protocol.ts`, `formatError` from `src/sandbox/runner.ts`.
- Produces: `runSqlChecks(opts: { files: Record<string,string>; entry?: string; checks: Check[]; createDb?: () => Promise<SqlDb>; timeoutMs?: number }): Promise<SqlRunOutcome>` where `SqlRunOutcome = { kind: 'results'; results: CheckResult[]; allPassed: boolean }`, and `runSqlScript(files, entry, createDb)` returning `{ columns: string[]; rows: Record<string, unknown>[]; error: string | null; statements: number }` for the preview grid.
- SQL exercise file conventions: `entry` defaults to `'query.sql'`; an optional `seed.sql` in `files` runs first; the entry runs second; checks then run against the same database.

- [ ] **Step 1: Write the failing test (node environment)**

Create `src/sandbox/sql/runSqlChecks.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { runSqlChecks, runSqlScript } from './runSqlChecks';
import type { Check } from '../../content/types';

const seed = 'create table tasks (id int primary key, title text); insert into tasks values (1, ''a''), (2, ''b'');'.replace(/''/g, "'");

describe('runSqlChecks', () => {
  it('applies seed then entry, gives each check a fresh db, and reports pass/fail', { timeout: 60_000 }, async () => {
    const checks: Check[] = [
      { name: 'row was inserted', run: async ({ db, expect }) => {
        const r = await db.query<{ n: number }>('select count(*)::int as n from tasks');
        expect(r.rows[0]?.n).to.equal(3);
      } },
      { name: 'fresh db per check', run: async ({ db, expect }) => {
        await db.exec('insert into tasks values (99, ''z'')'.replace(/''/g, "'"));
        const r = await db.query<{ n: number }>('select count(*)::int as n from tasks');
        expect(r.rows[0]?.n).to.equal(4); // 3 + 1, not 5
      } },
      { name: 'deliberately failing', run: async ({ expect }) => { expect(1).to.equal(2); } },
    ];
    const out = await runSqlChecks({
      files: { 'seed.sql': seed, 'query.sql': "insert into tasks values (3, 'c');" },
      checks,
    });
    expect(out.results.map((r) => r.status)).toEqual(['pass', 'pass', 'fail']);
    expect(out.allPassed).toBe(false);
    expect(out.results[2]?.error).toMatch(/expected 1 to equal 2/);
  });

  it('a failing statement in the entry fails every check with the SQL error', { timeout: 60_000 }, async () => {
    const out = await runSqlChecks({
      files: { 'query.sql': 'select * from nope;' },
      checks: [{ name: 'a', run: () => {} }, { name: 'b', run: () => {} }],
    });
    expect(out.results.every((r) => r.status === 'fail')).toBe(true);
    expect(out.results[0]?.error).toMatch(/does not exist/);
  });

  it('runSqlScript returns the last statement result for the preview grid', { timeout: 60_000 }, async () => {
    const r = await runSqlScript({ 'seed.sql': seed, 'query.sql': 'select title from tasks order by id' }, 'query.sql');
    expect(r.error).toBeNull();
    expect(r.columns).toEqual(['title']);
    expect(r.rows).toEqual([{ title: 'a' }, { title: 'b' }]);
    const bad = await runSqlScript({ 'query.sql': 'selec 1' }, 'query.sql');
    expect(bad.error).toMatch(/syntax/i);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run src/sandbox/sql/runSqlChecks.test.ts`
Expected: FAIL with "Cannot find module './runSqlChecks'".

- [ ] **Step 3: Implement the runner**

Create `src/sandbox/sql/runSqlChecks.ts`:

```ts
import { render } from '@testing-library/react';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { expect } from 'chai';
import type { Check, CheckContext, SqlDb } from '../../content/types';
import type { CheckResult } from '../protocol';
import { controls } from '../server/core';
import { formatError } from '../runner';
import { createSqlDb } from './db';
import { splitStatements } from './split';

export const DEFAULT_SQL_ENTRY = 'query.sql';
const DEFAULT_TIMEOUT_MS = 10_000;

export type SqlRunOutcome = { kind: 'results'; results: CheckResult[]; allPassed: boolean };

export type SqlScriptResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  error: string | null;
  statements: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Check timed out after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e: unknown) => { clearTimeout(t); reject(e); });
  });
}

/** Run seed.sql (if present) then the entry script. Throws with the failing statement on error. */
async function applyFiles(db: SqlDb, files: Record<string, string>, entry: string): Promise<number> {
  let count = 0;
  const seed = files['seed.sql'];
  if (seed) { await db.exec(seed); count += splitStatements(seed).length; }
  const script = files[entry];
  if (script === undefined) throw new Error(`Entry file '${entry}' not found`);
  await db.exec(script);
  count += splitStatements(script).length;
  return count;
}

/** For the preview pane: run the files and return the result of the entry's last statement. */
export async function runSqlScript(
  files: Record<string, string>,
  entry: string = DEFAULT_SQL_ENTRY,
  createDb: () => Promise<SqlDb> = createSqlDb,
): Promise<SqlScriptResult> {
  const db = await createDb();
  try {
    const seed = files['seed.sql'];
    if (seed) await db.exec(seed);
    const statements = splitStatements(files[entry] ?? '');
    let last: { rows: Record<string, unknown>[]; columns: string[] } = { rows: [], columns: [] };
    for (const s of statements) last = await db.query(s);
    return { columns: last.columns, rows: last.rows, error: null, statements: statements.length };
  } catch (e) {
    return { columns: [], rows: [], error: formatError(e), statements: 0 };
  } finally {
    await db.close();
  }
}

export async function runSqlChecks(opts: {
  files: Record<string, string>;
  entry?: string;
  checks: Check[];
  createDb?: () => Promise<SqlDb>;
  timeoutMs?: number;
}): Promise<SqlRunOutcome> {
  const entry = opts.entry ?? DEFAULT_SQL_ENTRY;
  const createDb = opts.createDb ?? createSqlDb;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const results: CheckResult[] = [];
  for (const check of opts.checks) {
    const started = performance.now();
    const db = await createDb();
    try {
      await applyFiles(db, opts.files, entry);
      const ctx: CheckContext = {
        get mod(): Record<string, unknown> { throw new Error('ctx.mod is not available in SQL exercises'); },
        get Component(): never { throw new Error('ctx.Component is not available in SQL exercises'); },
        render, screen, within,
        user: userEvent.setup(),
        act, expect,
        server: controls,
        sleep,
        db,
      };
      await withTimeout(Promise.resolve(check.run(ctx)), timeoutMs);
      results.push({ name: check.name, status: 'pass', durationMs: performance.now() - started });
    } catch (e) {
      results.push({ name: check.name, status: 'fail', error: formatError(e), durationMs: performance.now() - started });
    } finally {
      await db.close();
    }
  }
  return { kind: 'results', results, allPassed: results.every((r) => r.status === 'pass') };
}
```

If `formatError` is not exported from `src/sandbox/runner.ts`, export it (it is used by `preview-host.ts`, so it should already be). If `controls` lives elsewhere than `src/sandbox/server/core.ts`, fix the import path.

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run src/sandbox/sql/runSqlChecks.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck and commit**

Run: `pnpm typecheck`
Expected: clean.

```bash
git add src/sandbox/sql/runSqlChecks.ts src/sandbox/sql/runSqlChecks.test.ts
git commit -m "feat(sandbox): SQL check runner with fresh PGlite database per check" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Protocol and preview host support for SQL runs

**Files:**
- Modify: `src/sandbox/protocol.ts`
- Modify: `src/sandbox/preview-host.ts`
- Modify: `src/sandbox/preview-host.test.tsx`
- Modify: `src/app/exercise/sandbox-reducer.ts`
- Modify: `src/app/exercise/sandbox-reducer.test.ts`
- Modify: `src/app/exercise/useSandbox.ts`

**Interfaces:**
- Consumes: `runSqlChecks`, `runSqlScript` (Task 4).
- Produces: `ParentToFrame.runtime?: 'browser' | 'sql'`; new `FrameToParent` message `{ type: 'sql-result'; runId; columns: string[]; rows: Record<string, unknown>[]; error: string | null; statements: number }`; `SandboxState.sql: { columns; rows; error; statements } | null`; `useSandbox().runPreview/runChecks` accept an optional `runtime` fifth argument.

- [ ] **Step 1: Extend the protocol**

In `src/sandbox/protocol.ts`, add `runtime?: 'browser' | 'sql';` to `ParentToFrame` after `mode`, and add to the `FrameToParent` union:

```ts
  | { type: 'sql-result'; runId: number; columns: string[]; rows: Record<string, unknown>[]; error: string | null; statements: number }
```

- [ ] **Step 2: Write the failing reducer test**

Append to `src/app/exercise/sandbox-reducer.test.ts` (match its existing imports):

```ts
  it('stores sql-result for the current run and ignores stale ones', () => {
    let s = sandboxReducer(initialSandboxState, { type: 'start', runId: 3, mode: 'preview' });
    s = sandboxReducer(s, { type: 'message', msg: { type: 'sql-result', runId: 2, columns: ['x'], rows: [{ x: 1 }], error: null, statements: 1 } });
    expect(s.sql).toBeNull();
    s = sandboxReducer(s, { type: 'message', msg: { type: 'sql-result', runId: 3, columns: ['x'], rows: [{ x: 1 }], error: null, statements: 1 } });
    expect(s.sql?.rows).toEqual([{ x: 1 }]);
    expect(s.phase).toBe('ok');
    s = sandboxReducer(s, { type: 'message', msg: { type: 'sql-result', runId: 3, columns: [], rows: [], error: 'syntax error', statements: 0 } });
    expect(s.phase).toBe('runtime-error');
    expect(s.error?.message).toBe('syntax error');
  });
```

Run: `pnpm vitest run src/app/exercise/sandbox-reducer.test.ts`
Expected: FAIL (type error or `sql` undefined).

- [ ] **Step 3: Extend the reducer**

In `src/app/exercise/sandbox-reducer.ts`, add to `SandboxState`:

```ts
  sql: { columns: string[]; rows: Record<string, unknown>[]; error: string | null; statements: number } | null;
```

Add `sql: null` to `initialSandboxState`. In the `'start'` case, also reset `sql: null`. Add a case in the inner switch:

```ts
        case 'sql-result':
          if (msg.runId !== state.runId) return state;
          return {
            ...state,
            sql: { columns: msg.columns, rows: msg.rows, error: msg.error, statements: msg.statements },
            phase: msg.error ? 'runtime-error' : 'ok',
            error: msg.error ? { message: msg.error } : null,
          };
```

Run: `pnpm vitest run src/app/exercise/sandbox-reducer.test.ts`
Expected: PASS.

- [ ] **Step 4: Thread `runtime` through useSandbox**

In `src/app/exercise/useSandbox.ts`, change `send` to accept `runtime: ParentToFrame['runtime'] = 'browser'` as a fifth parameter and include `runtime` in the posted message. Change the returned callbacks:

```ts
    runPreview: useCallback((files: Record<string, string>, entry: string, key: string, runtime: ParentToFrame['runtime'] = 'browser') => send('preview', files, entry, key, runtime), [send]),
    runChecks: useCallback((files: Record<string, string>, entry: string, key: string, runtime: ParentToFrame['runtime'] = 'browser') => send('checks', files, entry, key, runtime), [send]),
```

- [ ] **Step 5: Write the failing preview-host test**

Read `src/sandbox/preview-host.test.tsx` to see how `createPreviewHost` is constructed with a fake `post`. Append:

```tsx
  it('runs SQL previews and checks through the sql runner when runtime is sql', async () => {
    const posted: FrameToParent[] = [];
    const fakeDb = () => Promise.resolve<SqlDb>({
      async query(sql: string) { return sql.includes('boom') ? Promise.reject(new Error('relation "boom" does not exist')) : { rows: [{ one: 1 }], columns: ['one'] }; },
      async exec(sql: string) { if (sql.includes('boom')) throw new Error('relation "boom" does not exist'); },
      async explain() { return ['Seq Scan on t']; },
      async close() {},
    });
    const host = createPreviewHost({
      post: (m) => posted.push(m),
      registry: baseRegistry,
      findChecks: () => [{ name: 'has a row', run: async ({ db, expect }) => { const r = await db.query('select 1 as one'); expect(r.rows.length).to.equal(1); } }],
      mount: document.createElement('div'),
      createSqlDb: fakeDb,
    });
    await host.handle({ type: 'run', runId: 1, mode: 'preview', runtime: 'sql', files: { 'query.sql': 'select 1 as one' }, entry: 'query.sql', exerciseKey: 'x/y' });
    expect(posted.at(-1)).toMatchObject({ type: 'sql-result', runId: 1, columns: ['one'], error: null });
    await host.handle({ type: 'run', runId: 2, mode: 'checks', runtime: 'sql', files: { 'query.sql': 'select 1 as one' }, entry: 'query.sql', exerciseKey: 'x/y' });
    expect(posted.at(-1)).toMatchObject({ type: 'check-results', runId: 2, allPassed: true });
    await host.handle({ type: 'run', runId: 3, mode: 'preview', runtime: 'sql', files: { 'query.sql': 'select * from boom' }, entry: 'query.sql', exerciseKey: 'x/y' });
    expect(posted.at(-1)).toMatchObject({ type: 'sql-result', runId: 3, error: expect.stringMatching(/boom/) });
  });
```

Add the imports the test needs (`FrameToParent` from `./protocol`, `SqlDb` from `../content/types`, `baseRegistry` from `./registry`).

Run: `pnpm vitest run src/sandbox/preview-host.test.tsx`
Expected: FAIL (unknown `createSqlDb` dep / no sql-result message).

- [ ] **Step 6: Branch the preview host on runtime**

In `src/sandbox/preview-host.ts`:
- Import `runSqlChecks, runSqlScript` from `./sql/runSqlChecks` and `createSqlDb as defaultCreateSqlDb` from `./sql/db`, and `SqlDb` type from `../content/types`.
- Add `createSqlDb?: () => Promise<SqlDb>;` to `Deps`.
- Add inside `createPreviewHost`:

```ts
  const createSqlDb = deps.createSqlDb ?? defaultCreateSqlDb;

  function renderSqlGrid(result: Awaited<ReturnType<typeof runSqlScript>>): void {
    unmount();
    deps.mount.textContent = '';
    if (result.error) {
      const pre = document.createElement('pre');
      pre.style.cssText = 'color:#f87171;white-space:pre-wrap;font-size:13px';
      pre.textContent = result.error;
      deps.mount.appendChild(pre);
      return;
    }
    const table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;font:12px ui-monospace,monospace';
    const head = table.createTHead().insertRow();
    for (const c of result.columns) { const th = document.createElement('th'); th.textContent = c; th.style.cssText = 'text-align:left;padding:4px 8px;border-bottom:1px solid #444'; head.appendChild(th); }
    const body = table.createTBody();
    for (const row of result.rows.slice(0, 200)) {
      const tr = body.insertRow();
      for (const c of result.columns) { const td = tr.insertCell(); const v = row[c]; td.textContent = v === null ? 'NULL' : typeof v === 'object' ? JSON.stringify(v) : String(v); td.style.cssText = 'padding:4px 8px;border-bottom:1px solid #2a2a2a'; }
    }
    const caption = document.createElement('p');
    caption.style.cssText = 'color:#9aa0a6;font-size:12px';
    caption.textContent = `${result.rows.length} row${result.rows.length === 1 ? '' : 's'}${result.rows.length > 200 ? ' (showing 200)' : ''} · ${result.statements} statement${result.statements === 1 ? '' : 's'}`;
    deps.mount.appendChild(table);
    deps.mount.appendChild(caption);
  }

  async function previewSql(msg: ParentToFrame): Promise<void> {
    const result = await runSqlScript(msg.files, msg.entry, createSqlDb);
    renderSqlGrid(result);
    deps.post({ type: 'sql-result', runId: msg.runId, columns: result.columns, rows: result.rows.slice(0, 200), error: result.error, statements: result.statements });
  }

  async function checkSql(msg: ParentToFrame): Promise<void> {
    const checks = deps.findChecks(msg.exerciseKey);
    if (!checks) {
      deps.post({ type: 'check-results', runId: msg.runId, allPassed: false, results: [{ name: 'exercise found', status: 'fail', error: `No checks registered for '${msg.exerciseKey}'`, durationMs: 0 }] });
      return;
    }
    const outcome = await runSqlChecks({ files: msg.files, entry: msg.entry, checks, createDb: createSqlDb });
    deps.post({ type: 'check-results', runId: msg.runId, results: outcome.results, allPassed: outcome.allPassed });
    await previewSql(msg);
  }
```

- Change `handle`:

```ts
    async handle(msg: ParentToFrame): Promise<void> {
      if (msg.type !== 'run') return;
      if (msg.runtime === 'sql') {
        if (msg.mode === 'preview') await previewSql(msg);
        else await checkSql(msg);
        return;
      }
      if (msg.mode === 'preview') renderPreview(msg);
      else await runExerciseChecks(msg);
    },
```

- [ ] **Step 7: Run tests and typecheck**

Run: `pnpm typecheck && pnpm vitest run src/sandbox src/app/exercise`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/sandbox/protocol.ts src/sandbox/preview-host.ts src/sandbox/preview-host.test.tsx src/app/exercise/sandbox-reducer.ts src/app/exercise/sandbox-reducer.test.ts src/app/exercise/useSandbox.ts
git commit -m "feat(sandbox): route sql-runtime runs through PGlite in the preview iframe" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: SQL exercise UI and validation

**Files:**
- Modify: `package.json` (add `@codemirror/lang-sql`)
- Modify: `src/app/exercise/CodeEditor.tsx`
- Modify: `src/app/steps/ExerciseStep.tsx`
- Modify: `src/app/steps/ExerciseStep.test.tsx`
- Modify: `src/content/__tests__/solutions.test.ts`
- Create: `src/content/lessons/_smoke-sql/` is NOT created; instead a test fixture lives in the test file.

**Interfaces:**
- Consumes: `useSandbox` runtime argument (Task 5), `SandboxState.sql`.
- Produces: `CodeEditor` prop `language?: 'tsx' | 'sql'`; `ExerciseStep` renders the SQL variant when `step.runtime === 'sql'`; `solutions.test.ts` validates SQL exercises with `runSqlChecks`.

- [ ] **Step 1: Install the SQL language mode**

Run: `pnpm add @codemirror/lang-sql@^6`

- [ ] **Step 2: Add a language prop to CodeEditor**

In `src/app/exercise/CodeEditor.tsx`: import `{ sql, PostgreSQL } from '@codemirror/lang-sql'`; add `language?: 'tsx' | 'sql'` to `Props` (default `'tsx'`); replace the `javascript({ jsx: true, typescript: true })` extension with `language === 'sql' ? sql({ dialect: PostgreSQL }) : javascript({ jsx: true, typescript: true })`; add `language` to the effect dependency array that recreates the editor.

- [ ] **Step 3: Write the failing ExerciseStep test**

Read `src/app/steps/ExerciseStep.test.tsx` to see how it renders an exercise with a stubbed sandbox. Append a test:

```tsx
  it('renders the SQL variant: sql editor tab, result grid placeholder, and passes runtime to the sandbox', () => {
    const step: ExerciseStepData = {
      kind: 'exercise', id: 'q', title: 'Write a query', prompt: 'p', hints: ['h'], checks: [{ name: 'c', run: () => {} }],
      runtime: 'sql', entry: 'query.sql',
      files: { 'seed.sql': 'create table t (x int);', 'query.sql': 'select 1' },
      solution: { 'seed.sql': 'create table t (x int);', 'query.sql': 'select 1' },
    };
    render(<ExerciseStep step={step} lessonId="l" />);
    expect(screen.getByRole('tab', { name: 'query.sql' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'seed.sql' })).toBeInTheDocument();
    expect(screen.getByText(/results/i)).toBeInTheDocument();
  });
```

Run: `pnpm vitest run src/app/steps/ExerciseStep.test.tsx`
Expected: FAIL (no "results" heading for SQL).

- [ ] **Step 4: Branch ExerciseStep on runtime**

In `src/app/steps/ExerciseStep.tsx`:
- Compute `const runtime = step.runtime ?? 'browser';` and `const entry = step.entry ?? (runtime === 'sql' ? 'query.sql' : 'App.tsx');`.
- Pass `runtime === 'sql' ? 'sql' : 'browser'` as the fifth argument to `runPreview` and `runChecks`.
- Pass `language={runtime === 'sql' ? 'sql' : 'tsx'}` to `CodeEditor`.
- In the right column, when `runtime === 'sql'`, render above the iframe a small header `<h3 className="px-3 py-1 text-xs uppercase tracking-wide text-ink-muted border-b border-border">Results</h3>` (the iframe itself still renders the grid; the header labels it) and, when `state.sql?.error`, render the error text under the header in `text-danger` (use the existing danger/warning token names found in `src/index.css`).
- Rename the "Run checks" button label to "Run checks" for both runtimes; keep Mod-Enter behaviour.

Run: `pnpm vitest run src/app/steps/ExerciseStep.test.tsx`
Expected: PASS.

- [ ] **Step 5: Extend solutions.test.ts for SQL exercises**

Replace the body of the loop in `src/content/__tests__/solutions.test.ts` so it dispatches on runtime:

```ts
import { runSqlChecks } from '../../sandbox/sql/runSqlChecks';
// ...
  for (const { lesson, step } of exercises) {
    const runtime = step.runtime ?? 'browser';
    if (runtime === 'local') continue; // graded by go test; see local-exercises.test.ts
    describe(`${lesson.id}/${step.id}`, () => {
      it('solution passes every check', { timeout: 60_000 }, async () => {
        if (runtime === 'sql') {
          const out = await runSqlChecks({ files: step.solution, entry: step.entry, checks: step.checks });
          const failed = out.results.filter((r) => r.status === 'fail');
          expect(failed, failed.map((f) => `${f.name}: ${f.error}`).join('\n')).toEqual([]);
          return;
        }
        const out = await runChecks({ files: step.solution, entry: step.entry, checks: step.checks, registry: baseRegistry });
        if (out.kind === 'compile-error') throw new Error(out.error.message);
        const failed = out.results.filter((r) => r.status === 'fail');
        expect(failed, failed.map((f) => `${f.name}: ${f.error}`).join('\n')).toEqual([]);
      });

      it('starter fails at least one check (exercise is not trivially complete)', { timeout: 60_000 }, async () => {
        if (runtime === 'sql') {
          const out = await runSqlChecks({ files: step.files, entry: step.entry, checks: step.checks });
          expect(out.allPassed).toBe(false);
          return;
        }
        const out = await runChecks({ files: step.files, entry: step.entry, checks: step.checks, registry: baseRegistry });
        if (out.kind === 'compile-error') return;
        expect(out.allPassed).toBe(false);
      });

      it('starter and solution have the same file names, and hints/prompt are non-empty', () => {
        expect(Object.keys(step.files).sort()).toEqual(Object.keys(step.solution).sort());
        expect(step.prompt.trim().length).toBeGreaterThan(0);
        expect(step.checks.length).toBeGreaterThan(0);
        expect(step.hints.length).toBeGreaterThan(0);
      });
    });
  }
```

PGlite under the default jsdom environment: this file runs in jsdom. Verify with a temporary SQL exercise fixture that `runSqlChecks` works under jsdom (PGlite needs `WebAssembly`, `TextDecoder`, and `URL`, all present in Node globals even under jsdom). If it fails only under jsdom, split SQL validation into `src/content/__tests__/sql-solutions.test.ts` with `// @vitest-environment node` and keep the dispatch above as a `continue` for `'sql'`.

- [ ] **Step 6: Typecheck and run everything**

Run: `pnpm typecheck && pnpm test`
Expected: PASS (no SQL lessons exist yet, so the SQL branches are exercised only by the unit tests).

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/app/exercise/CodeEditor.tsx src/app/steps/ExerciseStep.tsx src/app/steps/ExerciseStep.test.tsx src/content/__tests__/solutions.test.ts
git commit -m "feat(app): SQL exercise editor, results header, and solution validation for sql runtime" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Local-check dev-server plugin (go test runner)

**Files:**
- Create: `vite-plugin-local-check.ts`
- Create: `vite-plugin-local-check.test.ts`
- Create: `exercises-local/README.md`
- Create: `exercises-local/_smoke/go.mod`, `exercises-local/_smoke/smoke.go`, `exercises-local/_smoke/smoke_test.go`, `exercises-local/_smoke/solution/smoke.go`
- Modify: `vite.config.ts` (register plugin; add test include)
- Modify: `tsconfig.node.json` (include the new files)

**Interfaces:**
- Produces: `POST /__local-check` with JSON body `{ dir: string; tags?: string }` returning `LocalCheckResponse = { ok: boolean; tests: Array<{ name: string; status: 'pass'|'fail'|'skip'; output: string }>; raw: string; durationMs: number; error?: 'bad-request'|'forbidden'|'not-found'|'go-not-found'|'timeout'|'spawn-failed' }`; exported pure helpers `resolveExerciseDir(root, dir)`, `parseGoTestJson(raw)`, `createLocalCheckHandler(deps)`.

- [ ] **Step 1: Write the failing plugin test**

Create `vite-plugin-local-check.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createLocalCheckHandler, parseGoTestJson, resolveExerciseDir, type SpawnResult } from './vite-plugin-local-check.ts';

const root = 'C:/repo';

describe('resolveExerciseDir', () => {
  it('accepts simple relative folders and rejects traversal and absolute paths', () => {
    expect(resolveExerciseDir(root, '102-go/02-tests')).toMatch(/exercises-local[\\/]102-go[\\/]02-tests$/);
    for (const bad of ['../x', 'a/../../x', '/etc', 'C:/x', '\\\\server\\share', 'a\\..\\b', '']) {
      expect(resolveExerciseDir(root, bad), bad).toBeNull();
    }
  });
});

describe('parseGoTestJson', () => {
  it('collects pass/fail/skip per test with its output', () => {
    const raw = [
      '{"Action":"run","Test":"TestAdd"}',
      '{"Action":"output","Test":"TestAdd","Output":"=== RUN   TestAdd\\n"}',
      '{"Action":"output","Test":"TestAdd","Output":"    add_test.go:9: want 3 got 2\\n"}',
      '{"Action":"fail","Test":"TestAdd","Elapsed":0.01}',
      '{"Action":"run","Test":"TestSub"}',
      '{"Action":"pass","Test":"TestSub","Elapsed":0}',
      '{"Action":"skip","Test":"TestSkip"}',
      '{"Action":"fail","Elapsed":0.02}',
      'not json at all',
    ].join('\n');
    expect(parseGoTestJson(raw)).toEqual([
      { name: 'TestAdd', status: 'fail', output: '=== RUN   TestAdd\n    add_test.go:9: want 3 got 2\n' },
      { name: 'TestSub', status: 'pass', output: '' },
      { name: 'TestSkip', status: 'skip', output: '' },
    ]);
  });
});

describe('createLocalCheckHandler', () => {
  const okSpawn = async (): Promise<SpawnResult> => ({ code: 1, stdout: '{"Action":"pass","Test":"TestA"}\n{"Action":"fail","Test":"TestB"}\n', stderr: '', timedOut: false });

  it('rejects non-POST, bad origin, malformed body, and traversal', async () => {
    const h = createLocalCheckHandler({ root, spawn: okSpawn, exists: async () => true });
    expect((await h('GET', '', undefined, 'localhost:5180')).status).toBe(405);
    expect((await h('POST', '{"dir":"a/b"}', 'http://evil.test', 'localhost:5180')).status).toBe(403);
    expect((await h('POST', 'nope', undefined, 'localhost:5180')).status).toBe(400);
    expect((await h('POST', '{"dir":"../x"}', undefined, 'localhost:5180')).status).toBe(400);
  });

  it('404s when the folder is missing and 200s with parsed tests otherwise', async () => {
    const missing = createLocalCheckHandler({ root, spawn: okSpawn, exists: async () => false });
    expect((await missing('POST', '{"dir":"a/b"}', undefined, 'localhost:5180')).status).toBe(404);
    const h = createLocalCheckHandler({ root, spawn: okSpawn, exists: async () => true });
    const r = await h('POST', '{"dir":"a/b"}', 'http://localhost:5180', 'localhost:5180');
    expect(r.status).toBe(200);
    const body = JSON.parse(r.body);
    expect(body.ok).toBe(false);
    expect(body.tests).toEqual([{ name: 'TestA', status: 'pass', output: '' }, { name: 'TestB', status: 'fail', output: '' }]);
  });

  it('maps ENOENT to go-not-found and timeouts to timeout', async () => {
    const enoent = createLocalCheckHandler({ root, spawn: async () => { throw Object.assign(new Error('spawn go ENOENT'), { code: 'ENOENT' }); }, exists: async () => true });
    expect(JSON.parse((await enoent('POST', '{"dir":"a/b"}', undefined, 'h')).body).error).toBe('go-not-found');
    const slow = createLocalCheckHandler({ root, spawn: async () => ({ code: null, stdout: '', stderr: '', timedOut: true }), exists: async () => true });
    expect(JSON.parse((await slow('POST', '{"dir":"a/b"}', undefined, 'h')).body).error).toBe('timeout');
  });
});
```

- [ ] **Step 2: Register the test and run it to verify it fails**

In `vite.config.ts`, change `test.include` to `['src/**/*.test.{ts,tsx}', 'vite-plugin-progress.test.ts', 'vite-plugin-local-check.test.ts']`. In `tsconfig.node.json`, add `"vite-plugin-local-check.ts", "vite-plugin-local-check.test.ts"` to `include`.

Run: `pnpm vitest run vite-plugin-local-check.test.ts`
Expected: FAIL with "Cannot find module './vite-plugin-local-check.ts'".

- [ ] **Step 3: Implement the plugin**

Create `vite-plugin-local-check.ts`:

```ts
import { spawn as nodeSpawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { isAbsolute, normalize, resolve, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

// This file must not import from src/ (it is compiled by tsconfig.node.json).

export const EXERCISES_DIR = 'exercises-local';
export const DEFAULT_TIMEOUT_MS = 60_000;

export type TestStatus = 'pass' | 'fail' | 'skip';
export type TestOutcome = { name: string; status: TestStatus; output: string };
export type LocalCheckError = 'bad-request' | 'forbidden' | 'not-found' | 'go-not-found' | 'timeout' | 'spawn-failed';
export type LocalCheckResponse = { ok: boolean; tests: TestOutcome[]; raw: string; durationMs: number; error?: LocalCheckError };

export type SpawnResult = { code: number | null; stdout: string; stderr: string; timedOut: boolean };
export type Spawner = (cwd: string, args: string[], timeoutMs: number) => Promise<SpawnResult>;

export type HandlerDeps = {
  root: string;
  spawn: Spawner;
  exists: (dir: string) => Promise<boolean>;
  timeoutMs?: number;
};

export type HandlerResult = { status: number; body: string };

/** Resolve `dir` strictly inside `<root>/exercises-local`. Returns null for anything suspicious. */
export function resolveExerciseDir(root: string, dir: string): string | null {
  if (typeof dir !== 'string' || dir.length === 0 || dir.length > 200) return null;
  if (dir.includes('..') || dir.includes('\0')) return null;
  if (isAbsolute(dir) || /^[A-Za-z]:/.test(dir) || dir.startsWith('/') || dir.startsWith('\\')) return null;
  if (!/^[A-Za-z0-9._-]+(?:[\\/][A-Za-z0-9._-]+)*$/.test(dir)) return null;
  const base = resolve(root, EXERCISES_DIR);
  const full = normalize(resolve(base, dir));
  if (full !== base && !full.startsWith(base + sep)) return null;
  return full;
}

/** Parse `go test -json` output into per-test outcomes (package-level events are ignored). */
export function parseGoTestJson(raw: string): TestOutcome[] {
  const byName = new Map<string, TestOutcome>();
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let ev: { Action?: string; Test?: string; Output?: string };
    try { ev = JSON.parse(line) as typeof ev; } catch { continue; }
    if (!ev.Test) continue;
    const t = byName.get(ev.Test) ?? { name: ev.Test, status: 'fail' as TestStatus, output: '' };
    if (ev.Action === 'output' && ev.Output) t.output += ev.Output;
    else if (ev.Action === 'pass') t.status = 'pass';
    else if (ev.Action === 'fail') t.status = 'fail';
    else if (ev.Action === 'skip') t.status = 'skip';
    byName.set(ev.Test, t);
  }
  return [...byName.values()];
}

function isSameOriginAsHost(origin: string, host: string): boolean {
  return origin === `http://${host}` || origin === `https://${host}`;
}

export function createLocalCheckHandler(deps: HandlerDeps) {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return async (method: string, body: string, origin?: string, host?: string): Promise<HandlerResult> => {
    if (method !== 'POST') return { status: 405, body: 'Method not allowed' };
    if (origin && host && !isSameOriginAsHost(origin, host)) return { status: 403, body: 'Forbidden' };
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { return { status: 400, body: 'Malformed JSON' }; }
    const dir = typeof parsed === 'object' && parsed !== null ? (parsed as { dir?: unknown }).dir : undefined;
    const tags = typeof parsed === 'object' && parsed !== null ? (parsed as { tags?: unknown }).tags : undefined;
    const full = typeof dir === 'string' ? resolveExerciseDir(deps.root, dir) : null;
    if (!full) return { status: 400, body: 'Invalid dir' };
    if (typeof tags !== 'undefined' && (typeof tags !== 'string' || !/^[A-Za-z0-9_,]*$/.test(tags))) return { status: 400, body: 'Invalid tags' };
    if (!(await deps.exists(full))) return { status: 404, body: 'No such exercise folder' };

    const args = ['test', '-json', '-count=1', ...(tags ? ['-tags', tags] : []), './...'];
    const started = Date.now();
    let result: SpawnResult;
    try {
      result = await deps.spawn(full, args, timeoutMs);
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      const error: LocalCheckError = code === 'ENOENT' ? 'go-not-found' : 'spawn-failed';
      const res: LocalCheckResponse = { ok: false, tests: [], raw: e instanceof Error ? e.message : String(e), durationMs: Date.now() - started, error };
      return { status: 200, body: JSON.stringify(res) };
    }
    const tests = parseGoTestJson(result.stdout);
    const res: LocalCheckResponse = {
      ok: !result.timedOut && result.code === 0 && tests.every((t) => t.status !== 'fail'),
      tests,
      raw: result.stdout + (result.stderr ? `\n${result.stderr}` : ''),
      durationMs: Date.now() - started,
      ...(result.timedOut ? { error: 'timeout' as const } : {}),
    };
    return { status: 200, body: JSON.stringify(res) };
  };
}

export const goSpawner: Spawner = (cwd, args, timeoutMs) =>
  new Promise((resolvePromise, reject) => {
    const child = nodeSpawn('go', args, { cwd, env: { ...process.env, GOFLAGS: '-mod=mod' }, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.stdout.setEncoding('utf8').on('data', (d: string) => { stdout += d; });
    child.stderr.setEncoding('utf8').on('data', (d: string) => { stderr += d; });
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => { clearTimeout(timer); resolvePromise({ code, stdout, stderr, timedOut }); });
  });

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => { data += chunk; if (data.length > 10_000) req.destroy(new Error('Body too large')); });
    req.on('end', () => resolvePromise(data));
    req.on('error', reject);
  });
}

export function localCheckPlugin(): Plugin {
  return {
    name: 'react-refresher-local-check',
    configureServer(server) {
      const handler = createLocalCheckHandler({
        root: server.config.root,
        spawn: goSpawner,
        exists: async (dir) => { try { await access(dir); return true; } catch { return false; } },
      });
      server.middlewares.use('/__local-check', (req: IncomingMessage, res: ServerResponse, next) => {
        void (async () => {
          try {
            const body = req.method === 'POST' ? await readBody(req) : '';
            const result = await handler(req.method ?? 'GET', body, req.headers.origin, req.headers.host);
            res.statusCode = result.status;
            if (result.status === 200) res.setHeader('Content-Type', 'application/json');
            res.end(result.body);
          } catch (e) {
            next(e);
          }
        })();
      });
    },
  };
}
```

- [ ] **Step 4: Run the plugin test**

Run: `pnpm vitest run vite-plugin-local-check.test.ts`
Expected: PASS. If `resolveExerciseDir` fails on the Windows-style cases because `resolve` treats `C:/repo` oddly under a POSIX test runner, use `root = process.cwd()` in the test instead of a literal.

- [ ] **Step 5: Register the plugin and add the smoke exercise**

In `vite.config.ts`, import `{ localCheckPlugin } from './vite-plugin-local-check.ts'` and add `localCheckPlugin()` to `plugins`. Add `'**/exercises-local/**'` to `server.watch.ignored` so `go test` build artifacts never trigger reloads.

Create `exercises-local/README.md`:

```md
# Local exercises

Each folder here is a real Go module graded by `go test`. The app runs it for you through the
dev server (`POST /__local-check`), or you can run it yourself:

    cd exercises-local/<lesson>/<step>
    go test ./...            # your code
    go test -tags solution ./...   # the reference solution (for the validation suite)

Solutions live in `solution/` behind the `solution` build tag so they never compile into your run.
`_smoke/` is a tiny fixture used by the framework tests.
```

Create `exercises-local/_smoke/go.mod`:

```
module smoke

go 1.25
```

Create `exercises-local/_smoke/smoke.go`:

```go
//go:build !solution

package smoke

// Add returns the sum of a and b. TODO: fix the bug.
func Add(a, b int) int {
	return a - b
}
```

Create `exercises-local/_smoke/solution/smoke.go`:

```go
//go:build solution

package smoke

func Add(a, b int) int {
	return a + b
}
```

Note: Go treats `solution/` as a separate package directory, so the tagged file above would not replace `smoke.go`. Use a single-directory layout instead: put the solution in `exercises-local/_smoke/smoke_solution.go` with `//go:build solution` and keep `smoke.go` with `//go:build !solution`. Delete the `solution/` folder idea from README and use this file-pair convention everywhere: `<name>.go` (`!solution`) and `<name>_solution.go` (`solution`). Update `README.md` accordingly.

Create `exercises-local/_smoke/smoke_test.go`:

```go
package smoke

import "testing"

func TestAdd(t *testing.T) {
	if got := Add(1, 2); got != 3 {
		t.Fatalf("Add(1, 2) = %d, want 3", got)
	}
}
```

- [ ] **Step 6: Prove the smoke fixture behaves under real go**

Run: `cd exercises-local/_smoke && go test ./... ; go test -tags solution ./...`
Expected: the first fails with "Add(1, 2) = -1, want 3"; the second passes. Return to the repo root.

- [ ] **Step 7: Typecheck and run everything, then commit**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

```bash
git add vite-plugin-local-check.ts vite-plugin-local-check.test.ts vite.config.ts tsconfig.node.json exercises-local
git commit -m "feat(dev): local-check plugin that grades exercises-local folders with go test -json" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Local exercise step UI and local-exercise validation

**Files:**
- Create: `src/app/steps/LocalExerciseStep.tsx`
- Create: `src/app/steps/LocalExerciseStep.test.tsx`
- Create: `src/app/exercise/local-check-client.ts`
- Modify: `src/app/steps/ExerciseStep.tsx` (dispatch to LocalExerciseStep when `runtime === 'local'`)
- Create: `src/content/__tests__/local-exercises.test.ts`

**Interfaces:**
- Consumes: `LocalCheckResponse` shape from Task 7 (duplicate the type in `local-check-client.ts`; app code cannot import the plugin file), `progressStore.completeStep(key)`, `Markdown`, `HintsPanel`, `Button`.
- Produces: `runLocalCheck(dir: string, fetchImpl?: typeof fetch): Promise<LocalCheckResponse>`, `<LocalExerciseStep step lessonId />`.

- [ ] **Step 1: Write the client with a failing test**

Create `src/app/exercise/local-check-client.ts`:

```ts
export type LocalTestOutcome = { name: string; status: 'pass' | 'fail' | 'skip'; output: string };
export type LocalCheckResponse = {
  ok: boolean;
  tests: LocalTestOutcome[];
  raw: string;
  durationMs: number;
  error?: 'bad-request' | 'forbidden' | 'not-found' | 'go-not-found' | 'timeout' | 'spawn-failed' | 'no-dev-server';
};

/** Calls the dev server's go test runner. Resolves with `error: 'no-dev-server'` in static builds. */
export async function runLocalCheck(dir: string, fetchImpl: typeof fetch = fetch): Promise<LocalCheckResponse> {
  let res: Response;
  try {
    res = await fetchImpl('/__local-check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dir }) });
  } catch {
    return { ok: false, tests: [], raw: '', durationMs: 0, error: 'no-dev-server' };
  }
  if (res.status === 404 && !res.headers.get('content-type')?.includes('json')) {
    return { ok: false, tests: [], raw: '', durationMs: 0, error: 'no-dev-server' };
  }
  if (!res.ok) return { ok: false, tests: [], raw: await res.text(), durationMs: 0, error: res.status === 404 ? 'not-found' : 'bad-request' };
  return (await res.json()) as LocalCheckResponse;
}

/** All expected tests present and passing. */
export function allExpectedPassed(response: LocalCheckResponse, expectedTests: string[]): boolean {
  if (!response.ok) return false;
  const passed = new Set(response.tests.filter((t) => t.status === 'pass').map((t) => t.name));
  return expectedTests.every((name) => passed.has(name));
}
```

Create `src/app/steps/LocalExerciseStep.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalExerciseStep } from './LocalExerciseStep';
import type { ExerciseStep as ExerciseStepData } from '../../content/types';
import { allExpectedPassed } from '../exercise/local-check-client';

const step: ExerciseStepData = {
  kind: 'exercise', id: 'add', title: 'Fix Add', prompt: 'Make the test pass.', hints: ['Use +'], checks: [],
  runtime: 'local',
  local: { dir: '_smoke', command: 'go test ./...', expectedTests: ['TestAdd'] },
  files: { 'smoke.go': 'package smoke\n\nfunc Add(a, b int) int { return a - b }\n' },
  solution: { 'smoke.go': 'package smoke\n\nfunc Add(a, b int) int { return a + b }\n' },
};

describe('LocalExerciseStep', () => {
  it('shows the folder, the command, and runs the check, rendering per-test results', async () => {
    const runner = vi.fn().mockResolvedValue({ ok: true, durationMs: 12, raw: '', tests: [{ name: 'TestAdd', status: 'pass', output: '' }] });
    const onComplete = vi.fn();
    render(<LocalExerciseStep step={step} lessonId="102" runner={runner} onComplete={onComplete} />);
    expect(screen.getByText(/exercises-local[\\/]_smoke/)).toBeInTheDocument();
    expect(screen.getByText('go test ./...')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /run go test/i }));
    expect(runner).toHaveBeenCalledWith('_smoke');
    expect(await screen.findByText('TestAdd')).toBeInTheDocument();
    expect(screen.getByText(/pass/i)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalledWith('102/add');
  });

  it('explains when go is missing and offers manual completion when there is no dev server', async () => {
    const runner = vi.fn().mockResolvedValue({ ok: false, durationMs: 0, raw: '', tests: [], error: 'go-not-found' });
    render(<LocalExerciseStep step={step} lessonId="102" runner={runner} onComplete={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /run go test/i }));
    expect(await screen.findByText(/install go/i)).toBeInTheDocument();
    const noServer = vi.fn().mockResolvedValue({ ok: false, durationMs: 0, raw: '', tests: [], error: 'no-dev-server' });
    render(<LocalExerciseStep step={step} lessonId="102" runner={noServer} onComplete={() => {}} />);
    await userEvent.click(screen.getAllByRole('button', { name: /run go test/i })[1]!);
    expect(await screen.findByRole('button', { name: /mark complete/i })).toBeInTheDocument();
  });
});

describe('allExpectedPassed', () => {
  it('requires every expected test to pass', () => {
    const ok = { ok: true, durationMs: 0, raw: '', tests: [{ name: 'A', status: 'pass' as const, output: '' }] };
    expect(allExpectedPassed(ok, ['A'])).toBe(true);
    expect(allExpectedPassed(ok, ['A', 'B'])).toBe(false);
    expect(allExpectedPassed({ ...ok, ok: false }, ['A'])).toBe(false);
  });
});
```

Run: `pnpm vitest run src/app/steps/LocalExerciseStep.test.tsx`
Expected: FAIL with "Cannot find module './LocalExerciseStep'".

- [ ] **Step 2: Implement the step component**

Create `src/app/steps/LocalExerciseStep.tsx`:

```tsx
import { useState } from 'react';
import type { ExerciseStep as ExerciseStepData } from '../../content/types';
import { stepKey } from '../../content/registry';
import { progressStore, useProgress } from '../progress/useProgress';
import { Markdown } from '../components/Markdown';
import { Button } from '../components/Button';
import { HintsPanel } from '../exercise/HintsPanel';
import { CodeEditor } from '../exercise/CodeEditor';
import { allExpectedPassed, runLocalCheck, type LocalCheckResponse } from '../exercise/local-check-client';

type Props = {
  step: ExerciseStepData;
  lessonId: string;
  runner?: (dir: string) => Promise<LocalCheckResponse>;
  onComplete?: (key: string) => void;
};

const errorText: Record<NonNullable<LocalCheckResponse['error']>, string> = {
  'go-not-found': 'The dev server could not find `go` on your PATH. Install Go from https://go.dev/dl/ (1.22 or newer), restart the dev server, and try again.',
  'no-dev-server': 'No dev server is running (static build). Run the command below in your terminal, then mark the step complete.',
  timeout: 'go test ran for more than 60 seconds and was stopped. Look for an infinite loop or a blocked goroutine.',
  'not-found': 'The exercise folder is missing. Check that the repository is up to date.',
  'bad-request': 'The dev server rejected the request.',
  forbidden: 'The dev server rejected the request origin.',
  'spawn-failed': 'The dev server could not start go test. See the raw output.',
};

export function LocalExerciseStep({ step, lessonId, runner = runLocalCheck, onComplete = (key) => progressStore.completeStep(key) }: Props) {
  const key = stepKey(lessonId, step.id);
  const progress = useProgress();
  const done = progress.steps[key] !== undefined;
  const local = step.local;
  const fileNames = Object.keys(step.files);
  const [activeFile, setActiveFile] = useState(fileNames[0] ?? '');
  const [showSolution, setShowSolution] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<LocalCheckResponse | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  if (!local) return <p className="p-5 text-danger">This exercise is marked runtime: local but has no `local` config.</p>;
  const folder = `exercises-local/${local.dir}`;

  async function run() {
    setRunning(true);
    try {
      const r = await runner(local!.dir);
      setResult(r);
      if (allExpectedPassed(r, local!.expectedTests)) onComplete(key);
    } finally {
      setRunning(false);
    }
  }

  const source = showSolution ? step.solution : step.files;

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(280px,1fr)_minmax(0,1.6fr)_minmax(280px,1fr)]">
      <aside className="min-h-0 overflow-y-auto border-r border-border p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">{step.title}</h2>
          {done && <span className="shrink-0 text-xs text-success">✓ Complete</span>}
        </div>
        <Markdown source={step.prompt} className="mt-3" />
        <div className="mt-4 rounded border border-border bg-surface-2 p-3 text-sm">
          <p className="text-ink-muted">Runs on your machine:</p>
          <p className="mt-1 font-mono text-xs break-all">{folder}</p>
          <p className="mt-1 font-mono text-xs">{local.command}</p>
        </div>
        <HintsPanel hints={step.hints} />
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button size="sm" variant={showSolution ? 'primary' : 'ghost'} onClick={() => setShowSolution((s) => !s)}>
            {showSolution ? 'Hide solution' : 'Show solution'}
          </Button>
        </div>
      </aside>

      <section className="flex min-h-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface-2 pr-2">
          <div role="tablist" className="flex">
            {fileNames.map((name) => (
              <button key={name} role="tab" type="button" aria-selected={name === activeFile} onClick={() => setActiveFile(name)}
                className={`px-3 py-1.5 text-xs font-mono border-r border-border ${name === activeFile ? 'bg-surface text-ink' : 'text-ink-muted hover:text-ink'}`}>
                {name}
              </button>
            ))}
          </div>
          <span className="text-xs text-ink-muted">Read-only copy. Edit the files in {folder}.</span>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor key={`${activeFile}:${showSolution}`} value={source[activeFile] ?? ''} readOnly />
        </div>
      </section>

      <section className="min-h-0 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => void run()} disabled={running}>{running ? 'Running…' : 'Run go test'}</Button>
          {result && <span className="text-xs text-ink-muted">{result.durationMs} ms</span>}
        </div>
        {result?.error && (
          <div className="rounded border border-warning/40 bg-warning/10 p-3 text-sm">
            <Markdown source={errorText[result.error]} />
            {result.error === 'no-dev-server' && !done && (
              <Button size="sm" className="mt-2" onClick={() => onComplete(key)}>Mark complete</Button>
            )}
          </div>
        )}
        {result && result.tests.length > 0 && (
          <ul className="space-y-1">
            {result.tests.map((t) => (
              <li key={t.name} className="rounded border border-border p-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono">{t.name}</span>
                  <span className={t.status === 'pass' ? 'text-success' : t.status === 'fail' ? 'text-danger' : 'text-ink-muted'}>{t.status}</span>
                </div>
                {t.status === 'fail' && t.output && <pre className="mt-1 whitespace-pre-wrap text-xs text-ink-muted">{t.output}</pre>}
              </li>
            ))}
          </ul>
        )}
        {result && (
          <button type="button" className="text-xs text-ink-muted underline" onClick={() => setShowRaw((s) => !s)}>
            {showRaw ? 'Hide raw output' : 'Show raw output'}
          </button>
        )}
        {showRaw && result && <pre className="whitespace-pre-wrap text-xs">{result.raw}</pre>}
      </section>
    </div>
  );
}
```

Check `Button` accepts `className`; if not, wrap in a `div` with the margin. Check the color token names `text-danger`, `text-warning`, `text-success` exist in `src/index.css` (`@theme`); use the existing names.

In `src/app/steps/ExerciseStep.tsx`, at the top of the component body add:

```tsx
  if (step.runtime === 'local') return <LocalExerciseStep step={step} lessonId={lessonId} />;
```

Because hooks are called after this early return, move it into a small wrapper instead: rename the existing component to `BrowserOrSqlExerciseStep` and export:

```tsx
export function ExerciseStep(props: { step: ExerciseStepData; lessonId: string }) {
  if (props.step.runtime === 'local') return <LocalExerciseStep {...props} />;
  return <BrowserOrSqlExerciseStep {...props} />;
}
```

- [ ] **Step 3: Run the step tests**

Run: `pnpm vitest run src/app/steps`
Expected: PASS.

- [ ] **Step 4: Add the local-exercise validation test**

Create `src/content/__tests__/local-exercises.test.ts`:

```ts
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { getLessons } from '../registry';
import type { ExerciseStep } from '../types';

const goAvailable = spawnSync('go', ['version'], { encoding: 'utf8', windowsHide: true }).status === 0;
const root = resolve(import.meta.dirname, '../../..');

const locals = getLessons().flatMap((lesson) =>
  lesson.steps
    .filter((s): s is ExerciseStep => s.kind === 'exercise' && s.runtime === 'local')
    .map((step) => ({ lesson, step })),
);

function goTest(dir: string, tags?: string) {
  const args = ['test', '-count=1', ...(tags ? ['-tags', tags] : []), './...'];
  return spawnSync('go', args, { cwd: dir, encoding: 'utf8', windowsHide: true, timeout: 120_000 });
}

describe('local (go) exercises', () => {
  it('smoke fixture: starter fails, solution passes', { timeout: 180_000 }, () => {
    if (!goAvailable) { console.warn('go not installed; skipping local exercise validation'); return; }
    const dir = resolve(root, 'exercises-local/_smoke');
    expect(goTest(dir).status).not.toBe(0);
    expect(goTest(dir, 'solution').status).toBe(0);
  });

  for (const { lesson, step } of locals) {
    describe(`${lesson.id}/${step.id}`, () => {
      it('declares a folder that exists with a go.mod and expected tests', () => {
        expect(step.local, 'runtime local requires step.local').toBeDefined();
        const dir = resolve(root, 'exercises-local', step.local!.dir);
        expect(existsSync(resolve(dir, 'go.mod')), `${dir}/go.mod missing`).toBe(true);
        expect(step.local!.expectedTests.length).toBeGreaterThan(0);
        expect(step.hints.length).toBeGreaterThan(0);
        expect(step.checks).toEqual([]);
      });

      it('starter fails and solution passes under go test (and vets clean)', { timeout: 300_000 }, () => {
        if (!goAvailable) { console.warn('go not installed; skipping'); return; }
        const dir = resolve(root, 'exercises-local', step.local!.dir);
        const starter = goTest(dir);
        expect(starter.status, 'starter should fail at least one test').not.toBe(0);
        const solution = goTest(dir, 'solution');
        expect(solution.status, `solution failed:\n${solution.stdout}\n${solution.stderr}`).toBe(0);
        const vet = spawnSync('go', ['vet', '-tags', 'solution', './...'], { cwd: dir, encoding: 'utf8', windowsHide: true });
        expect(vet.status, `go vet failed:\n${vet.stderr}`).toBe(0);
      });
    });
  }
});
```

Run: `pnpm vitest run src/content/__tests__/local-exercises.test.ts`
Expected: PASS (smoke fixture only, since no local lessons exist yet).

- [ ] **Step 5: Typecheck, run everything, and try it in the browser**

Run: `pnpm typecheck && pnpm test`
Expected: PASS. Then temporarily verify the endpoint end to end:

```bash
curl -s -X POST -H "Content-Type: application/json" -d "{\"dir\":\"_smoke\"}" http://127.0.0.1:5180/__local-check
```

Expected: JSON with `"ok":false` and a `TestAdd` failure (restart the dev server first so the new plugin loads).

- [ ] **Step 6: Commit**

```bash
git add src/app/steps/LocalExerciseStep.tsx src/app/steps/LocalExerciseStep.test.tsx src/app/exercise/local-check-client.ts src/app/steps/ExerciseStep.tsx src/content/__tests__/local-exercises.test.ts
git commit -m "feat(app): local exercise step graded through the dev server's go test runner" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Authoring docs for the new runtimes

**Files:**
- Modify: `docs/authoring-lessons.md`
- Modify: `docs/authoring-runbook.md`
- Modify: `.superpowers/authoring/queue.mjs` (no change needed; verify it still parses the new curriculum entries)

**Interfaces:**
- Consumes: conventions from Tasks 3–8.

- [ ] **Step 1: Document SQL exercises**

Append to `docs/authoring-lessons.md` a section `## SQL exercises (runtime: 'sql')` covering: folder files `prompt.md`, `starter.sql`, `solution.sql`, optional `seed.sql`, `hints.md`, `checks.tsx`; the `lesson.ts` step shape:

```ts
{
  kind: 'exercise', id: '02-write-the-schema', title: 'Write the schema', prompt,
  runtime: 'sql', entry: 'query.sql',
  files: { 'seed.sql': seed, 'query.sql': starter },
  solution: { 'seed.sql': seed, 'query.sql': solution },
  hints: parseHints(hints), checks,
}
```

and check conventions: `ctx.db.query` returns `{ rows, columns }`; each check gets a fresh database with `seed.sql` then the learner's file applied; a SQL error in the learner's file fails every check with the message; use `ctx.db.explain(sql)` and assert on plan text (`/Index Scan|Index Only Scan/` and no `/Seq Scan on tasks/`) for index exercises; cast counts with `::int` because PGlite returns `bigint` as string; `ctx.mod`/`ctx.Component` throw; keep checks under the 10 second watchdog; PGlite lacks extensions beyond those bundled (no `pg_trgm` unless loaded; check `@electric-sql/pglite` docs) and has no `pg_stat_*` activity.

- [ ] **Step 2: Document local exercises**

Append `## Local exercises (runtime: 'local')` covering: folder `exercises-local/<lesson-id>/<step-id>/` with `go.mod` (`module <stepname>`, `go 1.25`), `<name>.go` tagged `//go:build !solution` (starter with TODOs), `<name>_solution.go` tagged `//go:build solution`, `<name>_test.go` untagged; the step shape:

```ts
{
  kind: 'exercise', id: '02-table-driven-tests', title: 'Table-driven tests', prompt,
  runtime: 'local',
  local: { dir: '102-go-for-typescript-developers/02-table-driven-tests', command: 'go test ./...', expectedTests: ['TestParseDuration', 'TestParseDurationErrors'] },
  files: { 'duration.go': starterGo },       // imported with ?raw for read-only display
  solution: { 'duration.go': solutionGo },
  hints: parseHints(hints), checks: [],
}
```

Rules: `checks` is empty; `expectedTests` must list every top-level test name in the `_test.go` file; the starter must compile and fail at least one test (a compile error in the starter is acceptable only if the prompt says so); the solution must pass `go test -tags solution ./...` and `go vet`; no network access in tests; keep test runtime under 20 seconds; use `t.Run` subtests freely (only top-level names are matched); Windows and Unix must both work (no shell-specific code).

- [ ] **Step 3: Update the runbook's Sandbox constraints**

In `docs/authoring-runbook.md` under "Sandbox constraints that shape exercises", add two bullets pointing at the new sections and state: SQL exercises run on PGlite in the browser and in Node; local exercises are graded by `go test` via the dev server and validated by `local-exercises.test.ts`, which needs Go on the machine running the suite.

- [ ] **Step 4: Verify the queue script and commit**

Run: `node .superpowers/authoring/queue.mjs .superpowers/authoring/tmp-check 4 && rm -rf .superpowers/authoring/tmp-check`
Expected: prints `pending 14` and lessons 102–105.

```bash
git add docs/authoring-lessons.md docs/authoring-runbook.md
git commit -m "docs(authoring): conventions for sql and local exercise runtimes" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

- **Spec coverage:** types and curriculum (Task 1), paths and dashboard (Task 2), PGlite wrapper (Task 3), SQL check runner and fresh-db-per-check (Task 4), protocol and preview grid (Task 5), SQL editor mode and solutions validation (Task 6), local runner plugin with path/origin/timeout/go-not-found handling (Task 7), local step UI with static-build fallback and `local-exercises.test.ts` (Task 8), authoring docs (Task 9). Content lessons 102–115 and the "Interview angle" tailoring are content work driven by the runbook, not this plan.
- **Placeholders:** none; every step has code or an exact command.
- **Type consistency:** `SqlDb` (Task 1) is what `createSqlDb` returns (Task 3) and what `runSqlChecks` injects as `ctx.db` (Task 4); `ParentToFrame.runtime` (Task 5) is what `useSandbox` sends and `ExerciseStep` passes (Task 6); `LocalCheckResponse` is duplicated between the plugin (Task 7) and the client (Task 8) on purpose, with the client adding `'no-dev-server'`; `LocalExerciseConfig.dir` is relative to `exercises-local/` in both the plugin and the UI.
