# Autonomous authoring runbook

This is the procedure a scheduled authoring run follows. It is the durable memory for
those runs: read it fully at the start of every run, even if you remember it.

## Goal

Turn the locked placeholders in `src/content/curriculum.ts` into real lessons, in
curriculum order, at the quality bar of lessons 01 to 03, fully tested, committed on
`main`. The learner is Chase: an experienced developer whose React knowledge stopped at
React 18 and who wants the whole 2026 frontend map, taught concept then exercise.

## Per-run procedure

1. **Preflight.** `git status --short` must be empty and the branch must be `main`. If the
   tree is dirty with someone else's edits, do not touch them: log it in
   `docs/authoring-log.md` and stop this run.
2. **Build the queue.** A lesson is *pending* when its id appears in `curriculum` but
   `src/content/lessons/<id>/lesson.ts` does not exist and the id is not listed under
   "Blocked" in `docs/authoring-log.md`. Take the first 4 pending ids in curriculum order.
   If none remain, append "Curriculum complete" to the log and stop.
3. **Author in parallel.** Dispatch one fresh implementer subagent per lesson (model:
   sonnet), all at once. Each brief contains: the lesson's id, title, summary, and track
   title/description from `curriculum.ts`; the paths of `docs/authoring-lessons.md` and this
   runbook; the "Quality bar" and "Rules for implementers" sections below verbatim; and
   the ids of the two previous lessons in the same track as style references. Implementers
   write only inside their own lesson folder (plus, if an exercise truly needs one, a new
   `src/sandbox/server/<name>.ts` registered in `src/sandbox/registry.ts` with a unit test).
   They do not commit.
4. **Verify.** When all implementers report, run `pnpm typecheck` and `pnpm test`. If a
   lesson fails, resume its implementer once with the exact failure. If it still fails,
   move its folder to `.authoring-quarantine/<id>/` (git-ignored), revert any registry or
   server changes it made, re-run the suite, and record `Blocked: <id> — <reason>` in the log.
5. **Commit** everything that passes as one commit:
   `feat(content): lessons <id>, <id>, ...` with the attribution trailer
   `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Never amend, never force.
6. **Log.** Append to `docs/authoring-log.md`: local timestamp, lessons added, blocked ids,
   pending count remaining, and anything the owner should know (a fact you could not
   verify, a sandbox limitation you hit). Commit the log in the same commit as the lessons
   when possible, otherwise as `docs(log): authoring run <timestamp>`.
7. **Time budget.** A run should finish in about 25 minutes. Tell implementers they have
   15 minutes; a lesson that is not done by then is quarantined for the next run, not
   rushed.

## Quality bar (paste into every implementer brief)

- **Shape:** 4 to 6 steps. Two or three `concept` steps of 600 to 1200 words each, one
  `quiz` of 5 or 6 questions with explanations, and one or two `exercise` steps when the
  topic can be graded in the sandbox. Alternate concept and exercise where possible.
- **Audience:** an experienced developer with React 18 habits. Skip beginner definitions,
  compare new things to what they replace, and say what changed and when. Prefer "why"
  over "what".
- **Accuracy:** it is September 2026. State versions and dates (React 19.3, Vite 8, TS 7,
  Tailwind 4.3, Vitest 5, React Router 8, Next.js 16). Verify with WebSearch/WebFetch
  against primary sources (MDN, web.dev, react.dev, official docs, roadmap.sh topic pages
  under https://roadmap.sh/frontend). If you cannot verify a claim, say so in the text or
  leave it out. End each concept step with a short "## Further reading (optional)" list of 2 to 4 links; the heading must say "(optional)" so learners know nothing tracks it.
- **Voice:** direct, concrete, no filler, no marketing. Code blocks over prose where code
  is clearer. Use `tsx`, `ts`, `bash`, `json`, `html`, or `css` fences (the highlighter
  knows only these).
- **Exercises:** must be gradeable by DOM behavior or by calling an exported function; a
  starter must fail at least one check; hints go from nudge to near-solution; checks must
  accept any correct solution, not one shape of code. See "Exercise patterns" in
  `docs/authoring-lessons.md` for how to grade non-React topics.
- **Quiz:** questions that test judgment, not recall of trivia; every explanation teaches
  the underlying rule.

## Rules for implementers (paste into every brief)

- Read `docs/authoring-lessons.md` first and mirror the structure of
  `src/content/lessons/01-rendering-and-state/` exactly (`lesson.ts`, numbered step files,
  `checks.tsx`, `hints.md`, `prompt.md`, `starter.tsx`, `solution.tsx`).
- Lesson `id` and `track` must match the `curriculum.ts` entry; step ids are unique within
  the lesson; the lesson `title` and `summary` may be refined but keep the id.
- Write only inside your lesson folder. Do not edit framework code, other lessons, or
  `curriculum.ts`. Exception: a new `@server/<name>` module with a test and a registry entry,
  if an exercise needs a fake backend; mention it in your report.
- Run `pnpm vitest run src/content` and `pnpm typecheck` until green. Do not commit.
- Do not dispatch subagents. Report: files written, step list, which starter checks fail,
  anything you could not verify, in under 15 lines.

## Sandbox constraints that shape exercises

- Learner code runs in a browser iframe and, for validation, in jsdom. Avoid APIs jsdom
  lacks (IntersectionObserver, ResizeObserver, matchMedia, service workers, WebSocket,
  Web Push, real network) unless the starter ships a tiny stub. `customElements` and
  Shadow DOM work in both.
- Available imports: `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`,
  `react-dom/client`, `react-dom/server`, `@server/todos`, `@server/users`, `@server/posts`, plus any server
  module you add and register.
- The preview renders the entry's default export (or `App`). Function-style exercises
  still need a small default component that displays the function's output.
- Checks receive `ctx` with `mod`, `Component`, `render`, `screen`, `within`, `user`,
  `act`, `expect` (chai), `server`, `sleep`. Import `waitFor` from
  `@testing-library/dom` when polling. Configure `ctx.server` before touching
  `ctx.Component` or `ctx.mod`.
- See "SQL exercises (runtime: 'sql')" in `docs/authoring-lessons.md`: these run on
  PGlite (in-memory Postgres) both in the browser and in Node.
- See "Local exercises (runtime: 'local')" in `docs/authoring-lessons.md`: these are
  graded by `go test` via the dev server, and validated by `local-exercises.test.ts`,
  which needs Go on the machine running the suite.
