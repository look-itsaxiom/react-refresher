# Authoring lessons

1. Add the lesson to `src/content/curriculum.ts` (or confirm its id is already listed as planned).
2. Create `src/content/lessons/<id>/lesson.ts` default-exporting a `Lesson` whose `id` matches.
3. For each step:
   - **concept**: a `.md` file imported with `?raw`.
   - **exercise**: a folder with `prompt.md`, `starter.tsx`, `solution.tsx`, `hints.md` (hints separated by a line containing only `---`), and `checks.tsx` exporting `checks: Check[]`.
   - **quiz**: a `.ts` file exporting a `QuizStep`.
4. Run `pnpm test`. The suite `src/content/__tests__/solutions.test.ts` fails if the solution does not pass every check or if the starter already passes.

## Writing checks

Checks receive a `CheckContext`:

```ts
{
  mod,        // the user's compiled module (lazy: evaluated on first access)
  Component,  // mod.default ?? mod.App
  render, screen, within, user, act,   // Testing Library + user-event + React.act
  expect,     // chai
  server,     // { reset(), setLatency(ms), failNext(message?) } for @server/*
  sleep(ms),
}
```

Rules:
- Configure `server` **before** touching `mod`/`Component`; module top-level code (like a cached `fetchUser(1)`) runs on first access. Destructuring `Component` in the check's parameter list counts as touching it, so for such exercises write `run: async (ctx) => { ctx.server.setLatency(300); const { render, Component } = ctx; ... }`.
- Each check gets a fresh module evaluation, fresh server state, latency 0, and a clean DOM.
- Assert on behavior visible in the DOM, never on source text. A user who solves it differently should still pass.
- Keep total check time under ~3s per exercise; default timeout per check is 5s.
- Make sure at least one check fails on the starter.
- Components that suspend (`use()`, Suspense) and transitions may not settle in jsdom after a bare `render()` or `user.click()`; wrap that call as `await ctx.act(async () => { ... })` and keep the assertions unchanged.
- Timer-based checks (`sleep`, latency) assume a foreground browser tab; Chrome throttles hidden tabs' timers, so run checks with the tab visible.

## Sandbox limits

User code can import only: `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client`, `react-dom/server` (renderToString for SSR/hydration exercises), and `@server/todos|users|posts`. To expose a new server module, add it under `src/sandbox/server/`, register it in `src/sandbox/registry.ts`, and list it in the plan's Global Constraints.
- A synchronous infinite loop in learner code freezes the preview tab; the 5s watchdog only covers async hangs. Reload the page to recover.

## Recurring rulings

These have come up repeatedly across lessons and are settled, not open questions:

- The checks file is named `checks.tsx` (not `checks.ts`) because checks contain JSX.
- Each check gets a fresh module evaluation — module-level state from one check never leaks into the next.
- `server` defaults to latency 0 for every check; a check that needs latency sets it explicitly.

## Exercise patterns for non-React topics

The sandbox grades client-side behavior, but most of the frontend map is not "write a
component". These patterns keep exercises gradeable:

- **Pure-function exercises.** The learner completes an exported function; checks call it
  through `ctx.mod`. Examples: decode a JWT payload and report its expiry; build a CSP
  header string from a policy object; decide whether a fetch is a CORS preflight; compute
  a `srcset`/`sizes` pair; pick a `Cache-Control` value for an asset type; normalize a
  GraphQL response into a cache map; compute a WCAG contrast ratio. Ship a tiny default
  `App` that renders the function's output so the preview shows something.
- **Fix-the-component exercises.** Give a working but flawed React component and grade the
  fix by DOM behavior: an inaccessible dialog (focus trap, `aria-modal`, Escape), a list
  that re-renders everything (assert render counts via a `data-renders` attribute), an
  unsafe `dangerouslySetInnerHTML` (assert the script text is escaped), a form that loses
  state on tab switch (use `<Activity>`).
- **Web platform exercises.** Custom elements and Shadow DOM work in both the iframe and
  jsdom; `fetch` can hit `@server/*` fakes; `AbortController`, streams, `structuredClone`,
  and `IndexedDB` (via `fake-indexeddb` if added to the registry) are fair game.
- **Reading exercises are quizzes.** When a topic cannot be exercised in a browser tab
  (deployment pipelines, OAuth server flows, bundler internals), teach with two or three
  concept steps and a demanding quiz; do not force a token exercise.

Each lesson should still end the learner with something they did, not only something
they read: aim for at least one exercise or a quiz that requires reasoning through code.

## SQL exercises (runtime: 'sql')

A SQL exercise runs the learner's file against a fresh PostgreSQL database (PGlite,
in-memory) instead of the browser sandbox. Folder layout, same as a browser exercise:

- `prompt.md`, `hints.md` (same format as browser exercises).
- `starter.sql` — the learner's starting file.
- `solution.sql` — the reference answer.
- `seed.sql` (optional) — schema and fixture data.
- `checks.tsx` exporting `checks: Check[]`.

The editor and checks always see the entry file as `query.sql`, regardless of the source
filenames on disk (`starter.sql`/`solution.sql`); `lesson.ts` maps them into that name:

```ts
import { splitHints } from '../../lesson-helpers';

{
  kind: 'exercise', id: '02-write-the-schema', title: 'Write the schema', prompt,
  runtime: 'sql', entry: 'query.sql',
  files: { 'seed.sql': seed, 'query.sql': starter },
  solution: { 'seed.sql': seed, 'query.sql': solution },
  hints: splitHints(hints), checks,
}
```

`entry` defaults to `'query.sql'`, so it can be omitted; the example states it for clarity.

Check conventions:
- Checks receive `ctx.db: SqlDb`: `ctx.db.query(sql, params?)` resolves `{ rows, columns }`;
  `ctx.db.exec(sql)` runs a multi-statement script and throws on the first failing statement;
  `ctx.db.explain(sql)` returns the `EXPLAIN (FORMAT TEXT)` lines. The runner opens and closes
  the database for you; do not call `ctx.db.close()` yourself.
- Each check starts from an empty `public` schema: one PGlite database boots per run (not
  per check), and its `public` schema is dropped and recreated before every check, then
  `seed.sql` (if present) runs, then the learner's `query.sql`. A SQL error in the learner's
  file fails every check with that error's message, before any check-specific assertion runs.
- `ctx.mod`, `ctx.Component`, `ctx.render`, `ctx.screen`, `ctx.within`, `ctx.user`, and
  `ctx.act` all throw in SQL exercises — they only exist for `runtime: 'browser'`. Use
  `ctx.db`, `ctx.expect`, `ctx.server`, `ctx.sleep`.
- For index exercises, assert on `ctx.db.explain(sql)` plan text — e.g. match
  `/Index Scan|Index Only Scan/` and assert the plan does *not* match `/Seq Scan on tasks/`.
- PGlite returns `count(*)` as a `bigint` string; cast with `::int` in the query before
  asserting on it as a number.
- Checks run under the same 10-second-per-check watchdog as browser exercises.
- PGlite only has the extensions bundled with `@electric-sql/pglite` (no `pg_trgm` or others
  unless the exercise explicitly loads one) and no `pg_stat_*` activity views — don't write a
  check that depends on either.

Validation: `src/content/__tests__/solutions.test.ts` runs SQL exercises through
`runSqlChecks` instead of the browser `runChecks`, but asserts the same three things as a
browser exercise: the solution passes every check, the starter fails at least one, and
hints/prompt/checks are non-empty.

## Local exercises (runtime: 'local')

A local exercise is a real Go module under `exercises-local/<lesson-id>/<step-id>/`, graded
by `go test` instead of anything in the browser sandbox. Folder layout (see
`exercises-local/README.md`):

- `go.mod` — `module <name>` / `go 1.25`.
- `<name>.go`, tagged `//go:build !solution` — the starter the learner edits, with TODOs.
- `<name>_solution.go`, tagged `//go:build solution` — the reference answer, kept out of the
  learner's build by the tag.
- `<name>_test.go` — no build tag, so it runs against whichever one is active.

Step shape:

```ts
import { splitHints } from '../../lesson-helpers';

{
  kind: 'exercise', id: '02-table-driven-tests', title: 'Table-driven tests', prompt,
  runtime: 'local',
  local: { dir: '102-go-for-typescript-developers/02-table-driven-tests', command: 'go test ./...', expectedTests: ['TestParseDuration', 'TestParseDurationErrors'] },
  files: { 'duration.go': starterGo },       // imported with ?raw for read-only display
  solution: { 'duration.go': solutionGo },
  hints: splitHints(hints), checks: [],
}
```

`local.dir` is relative to `exercises-local/`. `files`/`solution` are not used for grading —
they're read-only display copies imported with `?raw`, so `checks` is always `[]`.

Rules:
- `expectedTests` must list every top-level test name in the `_test.go` file (use `t.Run`
  subtests freely inside a test function; only the top-level names are matched).
- The starter must compile and fail at least one test. A starter that fails to compile is
  acceptable only if the prompt says so.
- The solution must pass `go test -tags solution ./...` and `go vet -tags solution ./...`.
- No network access in tests; keep the whole suite under ~20 seconds.
- Windows and Unix must both work — no shell-specific code in the Go files.

Grading in the app: the dev server exposes `POST /__local-check`
(`vite-plugin-local-check.ts`), which runs `go test -json ./...` inside
`exercises-local/<dir>`, parses per-test pass/fail, and matches the result against
`expectedTests`. There's a 60-second timeout, and the request fails clearly if `go` isn't on
the machine's `PATH`.

Validation: `src/content/__tests__/local-exercises.test.ts` calls `go test`/`go vet`
directly (not through the dev server). It checks that the folder and `go.mod` exist and
`expectedTests` is non-empty, that the starter fails `go test ./...`, and that the solution
passes both `go test -tags solution ./...` and `go vet -tags solution ./...`. It skips with a
console warning when `go` isn't installed on the machine running the suite.
