# React Refresher: Design Spec

Date: 2026-09-17
Status: Approved (design approved in chat; this is the written record)

## Purpose

A personal, local-first interactive learning tool for one developer (Chase) who last
worked seriously with React 18, did not use all of its features, and wants to be
refreshed on fundamentals and brought fully up to date on React 19, the React
Compiler, and the 2026 ecosystem. The tool alternates between teaching a concept and
exercising it in an in-browser code sandbox, freeCodeCamp-style, but with a curriculum
tailored to this developer and to current React.

This iteration builds the **framework** plus a small set of seed lessons that prove
every step type end to end. The full curriculum (~25-35 lessons, informed by
`docs/research/2026-09-17-react-landscape.md`) is added in the next iteration, and
appears in this iteration as locked placeholders on the dashboard.

## Decisions already made

| Decision | Choice | Why |
|---|---|---|
| Exercise mode | In-browser sandbox | Zero context switching; feels like a course |
| Server-side React | Teach + simulate | RSC/Server Actions cannot run in a browser sandbox; a fake async "server" module exposes the client-side half of the APIs |
| Scope this iteration | Framework + 3 seed lessons | Extend lessons next iteration; format must make adding lessons cheap and safe |
| Persistence | Local JSON file via Vite dev-server plugin | Durable, visible in git, survives cleared browser data |
| App stack | Vite 7 + React 19 + TS strict + Tailwind v4 + React Router v7 (library mode) + CodeMirror 6 + Sucrase + Vitest + pnpm | Modern defaults; the tool itself demonstrates the stack it teaches |
| Sandbox engine | Custom: Sucrase to CommonJS, evaluated with `new Function` inside a preview iframe against a module registry | Offline, fast, full control over graders; no arbitrary npm imports (a feature for a curriculum) |

Rejected: Sandpack (network-dependent bundler, awkward grader injection), esbuild-wasm
(10MB download, slow cold start, still need import resolution), Next.js for the tool
itself (heavier dev loop; sandbox is client-only regardless).

## Architecture

```
+---------------------------- Browser -----------------------------+
|  App (Vite entry: index.html)                                    |
|   |- Router: / (dashboard), /lesson/:id, /lesson/:id/:stepIndex  |
|   |- Content registry (import.meta.glob over src/content)        |
|   |- Progress store (useSyncExternalStore, debounced PUT)        |
|   '- Exercise view -- postMessage --> Preview iframe             |
|                                        (Vite entry: preview.html)|
|                                         |- module registry       |
|                                         |- Sucrase compile       |
|                                         |- render App to #root   |
|                                         |- run checks (hidden)   |
|                                         '- post results/console  |
+------------------------------------------------------------------+
                 | GET/PUT /__progress
+----------------v-------------------------------------------------+
|  Vite dev server + progress plugin  ->  progress/progress.json   |
+------------------------------------------------------------------+
```

### Content model

```
src/content/
  curriculum.ts                 -> ordered tracks + lesson ids (incl. planned/locked)
  lessons/<nn>-<slug>/
    lesson.ts                   -> Lesson: { id, title, track, summary, steps }
    01-concept.md               -> markdown (Shiki-highlighted code blocks)
    02-exercise/
      starter.tsx               -> initial editor contents
      solution.tsx              -> reveal on demand; used to validate lesson
      checks.ts                 -> graders (Testing Library + chai-style expect)
      hints.md                  -> hints separated by `---`, revealed progressively
    03-quiz.ts                  -> Quiz: multiple choice with explanations
```

Types (in `src/content/types.ts`):

```ts
type Step =
  | { kind: 'concept'; id: string; title: string; markdown: string }
  | { kind: 'exercise'; id: string; title: string; prompt: string;
      files: Record<string, string>;            // starter files, keyed by filename
      solution: Record<string, string>;
      hints: string[];
      checks: Check[];
      entry?: string;                            // default 'App.tsx'
      allowedModules?: string[] }               // beyond the default registry
  | { kind: 'quiz'; id: string; title: string; questions: QuizQuestion[] };

type Check = {
  name: string;
  run: (ctx: CheckContext) => Promise<void> | void;   // throws on failure
};

type CheckContext = {
  mod: Record<string, unknown>;      // the compiled user entry module's exports
  render: typeof import('@testing-library/react').render;
  screen: typeof import('@testing-library/dom').screen;
  within: typeof import('@testing-library/dom').within;
  user: ReturnType<typeof import('@testing-library/user-event').default.setup>;
  act: typeof import('react').act;
  expect: ChaiExpect;
  server?: SimulatedServer;          // present for server-track exercises
};
```

Starter and solution files are real `.tsx` files imported with `?raw` so the editor
gets their text, but they live inside `src/` so `tsc` type-checks them (they import
from the registry's public names: `react`, `react-dom/client`, `@server/*`). A path
alias maps `@server/*` to `src/sandbox/server/*`.

Lesson modules are discovered with `import.meta.glob('./lessons/*/lesson.ts', { eager: true })`.
`curriculum.ts` lists tracks and lesson ids in order; ids without a matching lesson
module render as locked placeholders with their planned title and summary.

### Sandbox runtime (preview iframe)

1. Iframe loads `preview.html`, which runs `src/sandbox/preview-main.ts` and builds the
   module registry: `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`,
   `react-dom/client`, `@testing-library/react`, `@testing-library/dom`,
   `@testing-library/user-event`, `@server/*` simulated modules, and the lesson's
   `allowedModules` if any (statically bundled; unknown import gives a clear error).
2. Parent posts `{ type: 'run', exerciseId, files, entry, mode: 'preview' | 'checks' }`.
3. Iframe compiles each file with Sucrase (`transforms: ['typescript','jsx','imports']`,
   `jsxRuntime: 'automatic'`, `production: false`), producing CJS. A `require` closure
   resolves user files relative to each other, then the registry, else throws
   `Cannot find module 'x'. This sandbox allows: [...]`.
4. `mode: 'preview'`: unmount previous root, create a new `react-dom/client` root in
   `#root`, render `mod.default ?? mod.App` inside an error boundary.
5. `mode: 'checks'`: the iframe looks up the lesson's `checks.ts` from the content
   registry (bundled with the iframe, matched by `exerciseId`), then runs each check
   sequentially in a hidden container with a fresh `render` and cleanup between checks,
   collecting `{ name, status: 'pass' | 'fail', error?: string }`.
6. `console.*` and uncaught errors are forwarded to the parent as messages.
7. Every run has a 5s watchdog; a hung check reports as failed with a timeout message.

The iframe is same-origin (served by Vite) with `sandbox="allow-scripts allow-same-origin"`;
communication is postMessage only, so user code never touches the parent's DOM.

### Simulated server (`src/sandbox/server/`)

A module exposing `createServer(options)` with artificial latency (default 600ms),
a failure toggle, and an in-memory store; lessons import narrow helpers from it, e.g.
`@server/todos` exporting `getTodos()`, `addTodo(formData)`, `toggleTodo(id)`. Lesson
text explains that in a real app these would be Server Functions.

### Progress store

- `progress/progress.json` shape:
  ```json
  { "version": 1, "steps": { "<lessonId>/<stepId>": { "completedAt": "ISO" } },
    "code": { "<lessonId>/<stepId>": { "<file>": "..." } },
    "quiz": { "<lessonId>/<stepId>": { "<questionId>": "<choiceId>" } },
    "lastVisited": "/lesson/01-state/2" }
  ```
- Vite plugin (`vite-plugin-progress.ts`): `GET /__progress` returns the file (or the
  empty shape), `PUT /__progress` validates the JSON shape and writes atomically.
- Client: `progressStore` (plain external store + `useSyncExternalStore` hook),
  optimistic local update, debounced (750ms) PUT, `saving/saved/error` indicator in
  the header. Export/import JSON buttons on the dashboard as a safety valve.
- In production build (no dev server) the store falls back to `localStorage`.

### UI

- **Dashboard** (`/`): tracks as sections, lessons as cards (done / in progress /
  available / locked), overall percentage, "Continue where you left off" button,
  export/import progress.
- **Lesson page** (`/lesson/:id/:stepIndex?`): left sidebar with step list and status
  dots; main area renders the current step; footer with Prev / Mark complete / Next.
  - Concept step: rendered markdown with Shiki code blocks, "Mark as read" completes it.
  - Quiz step: one question at a time, immediate feedback with explanation; completes
    when all answered.
  - Exercise step: three panes (prompt+hints | CodeMirror editor with file tabs |
    preview over check results + console). Ctrl/Cmd+Enter runs checks; preview
    re-renders on a 400ms debounce after typing. Hints reveal one at a time.
    "Reset to starter" and "Show solution" (confirm) buttons; solution opens in a
    read-only side panel so the user's code is not overwritten. All checks passing
    marks the step complete.
- Dark theme by default with a light toggle; Tailwind v4 tokens; keyboard-friendly.

### Error handling

- Compile errors: shown in the results pane with file/line from Sucrase's error.
- Runtime render errors: caught by the iframe error boundary, shown in results pane;
  preview shows an error card rather than a blank frame.
- Check failures: assertion message from chai; stack trimmed to user files.
- Timeouts: watchdog message suggesting infinite loop / missing `await`.
- Progress save failure: header indicator turns red with retry; local state is kept.

### Testing

- **Lesson validation suite** (`src/content/__tests__/solutions.test.ts`): for every
  exercise, compiles `solution` files with the same Sucrase pipeline, runs every check
  in jsdom, asserts all pass; also asserts the **starter** fails at least one check
  (so an exercise is never trivially complete).
- Unit tests: compiler/require resolution (`sandbox/compile.test.ts`), progress store
  (debounce, optimistic update, fallback), curriculum registry (locked vs available).
- Component tests (Testing Library in jsdom): quiz step flow, exercise step shows
  compile error, dashboard status derivation.
- The preview iframe's postMessage protocol is typed in one module shared by both
  sides (`src/sandbox/protocol.ts`).

## Seed lessons (this iteration)

1. **01-rendering-and-state** (Refresher track): concept "How React renders" (render,
   commit, state snapshots, batching); exercise: fix a counter that uses stale state;
   concept "Derived state and keys"; quiz (5 questions).
2. **02-suspense-and-transitions** (React 18 you skipped track): concept "Suspense as a
   loading boundary"; exercise: wrap a data component so a fallback shows, using a
   provided `use`-style resource; concept "startTransition / useTransition and
   useDeferredValue"; exercise: make a filter input stay responsive with
   `useDeferredValue` (check asserts deferred behavior through the DOM).
3. **03-actions-and-optimistic-ui** (React 19 track): concept "Actions, useActionState,
   useFormStatus"; exercise: convert a manual fetch+state form to a `<form action>` with
   `useActionState` against `@server/todos`; concept "useOptimistic"; exercise: add an
   optimistic todo that reconciles when the server responds (or rolls back on failure).

The dashboard also lists the planned curriculum (from the research report) as locked
placeholders grouped by track: Refresher, React 18 features you skipped, React 19,
Compiler-era patterns, Ecosystem (TanStack Query, Zustand, Zod, Tailwind v4, Vitest),
Server-side React (teach + simulate).

## Out of scope (this iteration)

Real RSC/Next.js execution, arbitrary npm imports in the sandbox, running the React
Compiler on user code, accounts or sync, mobile layout beyond "usable".

## Success criteria

- `pnpm dev` opens the dashboard; the three seed lessons can be completed end to end.
- `pnpm test` passes, including the solution-validation suite.
- `pnpm typecheck` passes with strict TS across app, sandbox, and lesson files.
- Adding a lesson requires only a new folder under `src/content/lessons` plus one
  line in `curriculum.ts`, and a wrong solution fails the test suite.
