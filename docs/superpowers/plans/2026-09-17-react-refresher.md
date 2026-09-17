# React Refresher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first interactive React learning tool: lessons that alternate concept, in-browser coding exercise, and quiz, with graded exercises running in a sandboxed iframe and progress saved to a JSON file in the repo.

**Architecture:** A Vite SPA (React 19, React Router 8 data mode) renders lessons discovered from `src/content/lessons/*/lesson.ts`. Exercises post the user's files to a second Vite entry (`preview.html`) that compiles TSX with Sucrase to CommonJS, evaluates it against a fixed module registry, renders the preview, and runs Testing-Library-based checks, reporting back via postMessage. A Vite dev-server plugin persists progress to `progress/progress.json`; a Vitest suite validates every exercise by running its checks against its solution and its starter.

**Tech Stack:** pnpm, Vite 8, @vitejs/plugin-react 6 (native React Compiler via `oxc-transform-react`), React 19.3, TypeScript 7 (strict), Tailwind CSS 4, React Router 8, CodeMirror 6, Sucrase 3, @testing-library/react 16 + user-event 14, chai 6, Vitest 5 + jsdom, react-markdown 10 + remark-gfm + @shikijs/rehype.

**Spec:** `docs/superpowers/specs/2026-09-17-react-refresher-design.md`

## Global Constraints

- Node 22.22 (installed: v22.22.1), pnpm 10 (installed: 10.32.1). Use `pnpm` for everything; never `npm install`.
- Every package is installed at its current latest version (as of 2026-09-17: react 19.3.0, vite 8.3.0, @vitejs/plugin-react 6.1.1, react-router 8.4.0, typescript 7.0.2, vitest 5.0.1, tailwindcss 4.3.3, sucrase 3.35.1, chai 6.2.2, @testing-library/react 16.3.3, @testing-library/user-event 14.6.7, react-markdown 10.1.0, @shikijs/rehype 4.4.3, codemirror 6.0.2). Do not pin older majors.
- TypeScript `strict: true`, `verbatimModuleSyntax: true`, `isolatedModules: true`. No `any` unless commented why. Use `import type` for types.
- React Router 8: import `createBrowserRouter`, `Link`, `NavLink`, `Outlet`, `useParams`, `useNavigate` from `react-router`; import `RouterProvider` from `react-router/dom`. `react-router-dom` does not exist anymore.
- The sandbox module registry is the ONLY way user code reaches libraries. Public module names: `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client`, `@server/todos`, `@server/users`, `@server/posts`.
- Exercise step key format everywhere: `${lessonId}/${stepId}` (e.g. `01-rendering-and-state/fix-the-counter`).
- Progress file shape has `version: 1` and lives at `progress/progress.json`, committed to git.
- Tests: Vitest with `environment: 'jsdom'`, `globals: false` (import `describe/it/expect/vi` from `vitest`). Test files live next to the code as `*.test.ts(x)`, except the lesson validation suite at `src/content/__tests__/solutions.test.ts` and the plugin test at repo root.
- Commit after every task with a conventional-commit message ending in the line `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Dark theme by default via `<html data-theme="dark">`; Tailwind dark variant is `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`.

---

## File Structure

```
index.html                         app entry HTML
preview.html                       sandbox iframe entry HTML
vite.config.ts                     Vite + Vitest config (React compiler, Tailwind, progress plugin, two entries)
vite-plugin-progress.ts            dev-server middleware: GET/PUT /__progress -> progress/progress.json
vite-plugin-progress.test.ts       tests for the pure request handler
tsconfig.json                      app + content + sandbox (browser), includes src/**
tsconfig.node.json                 vite.config.ts, plugin + its test (node types)
progress/progress.json             the user's progress (committed)
src/main.tsx                       mounts <RouterProvider>
src/index.css                      Tailwind import, theme tokens, shiki dual-theme CSS
src/app/router.tsx                 route table
src/app/Layout.tsx                 header (home link, save indicator, theme toggle) + <Outlet>
src/app/theme.ts                   theme read/write on <html data-theme>
src/app/Dashboard.tsx              tracks, lesson cards, continue button, export/import
src/app/dashboard-status.ts        pure: lesson/step status derivation from progress
src/app/dashboard-status.test.ts
src/app/LessonPage.tsx             stepper shell: sidebar + current step + prev/next
src/app/steps/ConceptStep.tsx
src/app/steps/QuizStep.tsx
src/app/steps/QuizStep.test.tsx
src/app/steps/ExerciseStep.tsx     three-pane exercise UI
src/app/steps/ExerciseStep.test.tsx
src/app/exercise/CodeEditor.tsx    CodeMirror 6 wrapper
src/app/exercise/useSandbox.ts     iframe bridge hook
src/app/exercise/sandbox-reducer.ts pure reducer for messages from the iframe
src/app/exercise/sandbox-reducer.test.ts
src/app/exercise/ChecksPanel.tsx
src/app/exercise/ConsolePanel.tsx
src/app/exercise/HintsPanel.tsx
src/app/components/Markdown.tsx    react-markdown + shiki
src/app/components/Button.tsx
src/app/progress/types.ts          Progress type + emptyProgress()
src/app/progress/store.ts          createProgressStore (external store)
src/app/progress/store.test.ts
src/app/progress/backends.ts       httpBackend, localStorageBackend
src/app/progress/useProgress.ts    useSyncExternalStore hooks + singleton store
src/content/types.ts               Lesson, Step, Check, CheckContext, QuizQuestion
src/content/curriculum.ts          tracks + ordered planned lessons
src/content/registry.ts            import.meta.glob discovery, lookups, curriculum view
src/content/registry.test.ts
src/content/__tests__/solutions.test.ts   every exercise: solution passes, starter fails
src/content/lessons/01-rendering-and-state/...
src/content/lessons/02-suspense-and-transitions/...
src/content/lessons/03-actions-and-optimistic-ui/...
src/sandbox/protocol.ts            postMessage message types
src/sandbox/compile.ts             Sucrase wrapper + CompileError
src/sandbox/compile.test.ts
src/sandbox/modules.ts             resolve + evaluate CommonJS user modules against a registry
src/sandbox/modules.test.ts
src/sandbox/registry.ts            baseRegistry (react, react-dom, @server/*)
src/sandbox/runner.ts              runChecks(): shared by iframe and Vitest
src/sandbox/runner.test.ts
src/sandbox/preview-main.tsx       iframe entry: message loop, preview root, console forwarding
src/sandbox/server/core.ts         latency, failNext, reset registry
src/sandbox/server/core.test.ts
src/sandbox/server/todos.ts
src/sandbox/server/users.ts
src/sandbox/server/posts.ts
```

---

### Task 1: Project scaffold with Vite 8, React 19, Tailwind 4, Vitest 5

**Files:**
- Create: `package.json`, `.gitignore`, `.npmrc`, `index.html`, `preview.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `src/main.tsx`, `src/index.css`, `src/vite-env.d.ts`, `src/smoke.test.ts`

**Interfaces:**
- Produces: `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm typecheck` scripts. `preview.html` entry exists (empty body with `<div id="root">`), to be filled in Task 7.

- [ ] **Step 1: Initialize package and install dependencies**

```bash
cd C:/Users/ChaseSkibeness/Projects/ReactRefresher
pnpm init
pnpm add react react-dom react-router sucrase chai @testing-library/react @testing-library/dom @testing-library/user-event react-markdown remark-gfm @shikijs/rehype shiki codemirror @codemirror/state @codemirror/view @codemirror/lang-javascript @codemirror/theme-one-dark @codemirror/commands @codemirror/language
pnpm add -D vite @vitejs/plugin-react oxc-transform-react tailwindcss @tailwindcss/vite typescript @types/react @types/react-dom @types/node vitest jsdom
```

Then edit `package.json` so it contains (keep the generated fields, replace/add these):

```json
{
  "name": "react-refresher",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit",
    "check": "pnpm typecheck && pnpm test"
  }
}
```

- [ ] **Step 2: Write config files**

`.gitignore`:
```
node_modules
dist
*.local
.DS_Store
```

`.npmrc`:
```
auto-install-peers=true
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"],
    "paths": { "@server/*": ["./src/sandbox/server/*"] }
  },
  "include": ["src"]
}
```

`tsconfig.node.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "vite-plugin-progress.ts", "vite-plugin-progress.test.ts"]
}
```

If `tsc` (TypeScript 7) rejects any option as removed, follow its message: TS 7 removed several deprecated options; none of the above are deprecated, but adjust if the compiler says otherwise and note it in the commit.

`vite.config.ts` (the progress plugin import is added in Task 6; for now no plugin):
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react({ compiler: true }), tailwindcss()],
  resolve: {
    alias: { '@server': fileURLToPath(new URL('./src/sandbox/server', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        preview: fileURLToPath(new URL('./preview.html', import.meta.url)),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'vite-plugin-progress.test.ts'],
  },
});
```

`index.html`:
```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React Refresher</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`preview.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Preview</title>
    <style>
      body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; color: #e6e6e6; background: #111318; }
      button { font: inherit; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/sandbox/preview-main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`src/index.css`:
```css
@import "tailwindcss";

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));

@theme {
  --color-surface: #0f1115;
  --color-surface-2: #171a21;
  --color-surface-3: #1f2430;
  --color-border: #2a3040;
  --color-ink: #e7e9ee;
  --color-ink-muted: #9aa3b2;
  --color-accent: #61dafb;
  --color-accent-strong: #22b8e6;
  --color-success: #4ade80;
  --color-danger: #f87171;
  --color-warning: #fbbf24;
}

:root[data-theme="light"] {
  --color-surface: #ffffff;
  --color-surface-2: #f5f6f8;
  --color-surface-3: #e9ebf0;
  --color-border: #d6dae3;
  --color-ink: #14171e;
  --color-ink-muted: #5b6474;
  --color-accent: #0a7ea4;
  --color-accent-strong: #086482;
}

html, body, #root { height: 100%; }
body { @apply bg-surface text-ink antialiased; }

/* shiki dual themes: light values are default, dark variables under data-theme=dark */
:root[data-theme="dark"] .shiki,
:root[data-theme="dark"] .shiki span {
  color: var(--shiki-dark) !important;
  background-color: var(--shiki-dark-bg) !important;
}
.shiki { @apply rounded-md p-3 text-[13px] leading-relaxed overflow-x-auto; }
```

`src/main.tsx` (temporary hello; replaced in Task 8):
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <h1 className="p-6 text-2xl font-semibold">React Refresher</h1>
  </StrictMode>,
);
```

- [ ] **Step 3: Write a smoke test that proves Vitest + jsdom + React work**

`src/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';

describe('toolchain smoke', () => {
  it('renders React into jsdom', () => {
    render(createElement('p', null, 'hello'));
    expect(screen.getByText('hello')).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run test, typecheck, and dev server boot**

Run: `pnpm test`
Expected: 1 test passes.

Run: `pnpm typecheck`
Expected: no errors. (`src/sandbox/preview-main.tsx` does not exist yet; `preview.html` references it but Vite only resolves that when the page is requested.)

Run: `pnpm build`
Expected: fails ONLY because `src/sandbox/preview-main.tsx` is missing. Create a stub `src/sandbox/preview-main.tsx` containing `export {};` so the build passes; Task 7 replaces it. Re-run `pnpm build`, expected: `dist/` produced with both `index.html` and `preview.html`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite 8 + React 19 + Tailwind 4 + Vitest 5 project" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Content types, curriculum, and lesson registry

**Files:**
- Create: `src/content/types.ts`, `src/content/curriculum.ts`, `src/content/registry.ts`, `src/content/registry.test.ts`

**Interfaces:**
- Produces:
  - `Lesson`, `Step`, `ConceptStep`, `ExerciseStep`, `QuizStep`, `QuizQuestion`, `Check`, `CheckContext`, `TrackId` types.
  - `tracks: Track[]`, `curriculum: PlannedLesson[]`.
  - `getLessons(): Lesson[]`, `getLesson(id): Lesson | undefined`, `stepKey(lessonId, stepId): string`, `findExercise(key): { lesson: Lesson; step: ExerciseStep } | undefined`, `getCurriculumView(): TrackView[]`.
- Consumes: nothing.

- [ ] **Step 1: Write the types**

`src/content/types.ts`:
```ts
import type { render } from '@testing-library/react';
import type { screen, within } from '@testing-library/dom';
import type userEvent from '@testing-library/user-event';
import type { act } from 'react';
import type { expect as chaiExpect } from 'chai';

export type TrackId = 'refresher' | 'react18' | 'react19' | 'compiler' | 'ecosystem' | 'server';

export type Track = { id: TrackId; title: string; description: string };

export type PlannedLesson = { id: string; title: string; summary: string; track: TrackId };

export type ConceptStep = { kind: 'concept'; id: string; title: string; markdown: string };

export type QuizChoice = { id: string; text: string };
export type QuizQuestion = {
  id: string;
  prompt: string;            // markdown
  choices: QuizChoice[];
  correctChoiceId: string;
  explanation: string;       // markdown, shown after answering
};
export type QuizStep = { kind: 'quiz'; id: string; title: string; questions: QuizQuestion[] };

/** Controls over the simulated server, available to checks. */
export type ServerControls = {
  reset(): void;
  setLatency(ms: number): void;
  failNext(message?: string): void;
};

export type CheckContext = {
  /** The user's compiled entry module. Evaluated lazily on first access, so configure `server` first. */
  readonly mod: Record<string, unknown>;
  /** `mod.default ?? mod.App`, typed loosely for rendering. */
  readonly Component: React.ComponentType;
  render: typeof render;
  screen: typeof screen;
  within: typeof within;
  user: ReturnType<typeof userEvent.setup>;
  act: typeof act;
  expect: typeof chaiExpect;
  server: ServerControls;
  /** Resolves after `ms` milliseconds. */
  sleep(ms: number): Promise<void>;
};

export type Check = {
  name: string;
  run: (ctx: CheckContext) => Promise<void> | void;
};

export type ExerciseStep = {
  kind: 'exercise';
  id: string;
  title: string;
  prompt: string;                     // markdown
  files: Record<string, string>;      // starter files by filename
  solution: Record<string, string>;
  hints: string[];
  checks: Check[];
  entry?: string;                     // default 'App.tsx'
};

export type Step = ConceptStep | ExerciseStep | QuizStep;

export type Lesson = {
  id: string;
  title: string;
  track: TrackId;
  summary: string;
  steps: Step[];
};

export type LessonView = { planned: PlannedLesson; lesson: Lesson | undefined };
export type TrackView = { track: Track; lessons: LessonView[] };
```

Add `import type * as React from 'react';` is not valid syntax with verbatimModuleSyntax; instead reference `React.ComponentType` via a normal type import at the top: `import type { ComponentType } from 'react';` and use `ComponentType` in `CheckContext`. Do that.

- [ ] **Step 2: Write the curriculum**

`src/content/curriculum.ts`:
```ts
import type { PlannedLesson, Track } from './types';

export const tracks: Track[] = [
  { id: 'refresher', title: 'Refresher', description: 'The fundamentals, re-explained the way React 19 thinks about them.' },
  { id: 'react18', title: 'React 18 features you skipped', description: 'Concurrent rendering, Suspense, transitions, and the hooks that came with them.' },
  { id: 'react19', title: 'React 19', description: 'Actions, use(), useOptimistic, ref as a prop, metadata, and what got removed.' },
  { id: 'compiler', title: 'Compiler-era patterns', description: 'What the React Compiler does for you and how to write code it can optimize.' },
  { id: 'ecosystem', title: 'Ecosystem 2026', description: 'Data fetching, state, forms, styling, testing, and tooling as actually used today.' },
  { id: 'server', title: 'Server-side React', description: 'Server Components and Server Functions: taught and simulated, not executed.' },
];

/** Ordered. Ids with a matching folder under ./lessons are playable; the rest render as locked. */
export const curriculum: PlannedLesson[] = [
  { id: '01-rendering-and-state', track: 'refresher', title: 'Rendering and state', summary: 'Trigger, render, commit. State as a snapshot. Batching and updater functions.' },
  { id: '04-effects-and-refs', track: 'refresher', title: 'You might not need an effect', summary: 'What effects are for, what they are not for, refs, and cleanup.' },
  { id: '05-context-and-composition', track: 'refresher', title: 'Context and composition', summary: 'Lifting state, children as data, context without prop drilling pain.' },
  { id: '06-custom-hooks', track: 'refresher', title: 'Custom hooks', summary: 'Extracting logic, stable identities, and the rules of hooks.' },
  { id: '07-lists-keys-forms', track: 'refresher', title: 'Lists, keys, and controlled inputs', summary: 'Identity, reconciliation, and forms before Actions.' },
  { id: '02-suspense-and-transitions', track: 'react18', title: 'Suspense and transitions', summary: 'Loading boundaries, startTransition, useTransition, useDeferredValue.' },
  { id: '08-concurrent-rendering', track: 'react18', title: 'Concurrent rendering mental model', summary: 'Interruptible rendering, priorities, and what StrictMode double-invokes.' },
  { id: '09-external-stores', track: 'react18', title: 'useSyncExternalStore and useId', summary: 'Subscribing to things outside React without tearing.' },
  { id: '03-actions-and-optimistic-ui', track: 'react19', title: 'Actions and optimistic UI', summary: 'useActionState, useFormStatus, form actions, useOptimistic.' },
  { id: '10-use-and-ref-changes', track: 'react19', title: 'use(), ref as a prop, ref cleanup', summary: 'Reading promises and context with use(); forwardRef is over.' },
  { id: '11-metadata-and-resources', track: 'react19', title: 'Document metadata and resource hints', summary: 'title/meta/link in components, stylesheet precedence, preload APIs.' },
  { id: '12-react-19-removals', track: 'react19', title: 'What React 19 removed', summary: 'propTypes, string refs, legacy context, ReactDOM.render, and how to migrate.' },
  { id: '24-activity-effect-events-view-transitions', track: 'react19', title: 'Activity, useEffectEvent, ViewTransition', summary: 'The 19.2 and 19.3 primitives: hide-but-keep-state, non-reactive effect logic, animated transitions.' },
  { id: '13-what-the-compiler-does', track: 'compiler', title: 'What the React Compiler does', summary: 'Automatic memoization, the rules it relies on, and reading its output.' },
  { id: '14-compiler-friendly-code', track: 'compiler', title: 'Writing compiler-friendly code', summary: 'Purity, mutation, and when useMemo/useCallback still matter.' },
  { id: '15-server-state-tanstack-query', track: 'ecosystem', title: 'Server state with TanStack Query', summary: 'Queries, mutations, invalidation, and why useEffect fetching is gone.' },
  { id: '16-client-state-zustand', track: 'ecosystem', title: 'Client state with Zustand and friends', summary: 'Stores without boilerplate; when context is enough.' },
  { id: '17-forms-and-validation', track: 'ecosystem', title: 'Forms and validation', summary: 'Actions vs react-hook-form vs TanStack Form; Zod schemas.' },
  { id: '18-styling-in-2026', track: 'ecosystem', title: 'Styling in 2026', summary: 'Tailwind v4, CSS Modules, and why runtime CSS-in-JS faded.' },
  { id: '19-testing-in-2026', track: 'ecosystem', title: 'Testing in 2026', summary: 'Vitest, Testing Library, Playwright, MSW, Storybook.' },
  { id: '20-typescript-react-idioms', track: 'ecosystem', title: 'TypeScript and React idioms', summary: 'ComponentProps, discriminated props, satisfies, no more React.FC debates.' },
  { id: '21-server-components', track: 'server', title: 'Server Components', summary: 'The client/server boundary, "use client", serialization rules.' },
  { id: '22-server-functions', track: 'server', title: 'Server Functions', summary: '"use server", calling the server from forms and events, revalidation.' },
  { id: '23-frameworks', track: 'server', title: 'Next.js, React Router framework mode, TanStack Start', summary: 'How the frameworks package RSC and where they differ.' },
];
```

- [ ] **Step 3: Write the failing registry test**

`src/content/registry.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { getLessons, getLesson, stepKey, findExercise, getCurriculumView } from './registry';
import { curriculum, tracks } from './curriculum';

describe('content registry', () => {
  it('discovers lessons and each has a matching curriculum entry', () => {
    const lessons = getLessons();
    for (const lesson of lessons) {
      const planned = curriculum.find((p) => p.id === lesson.id);
      expect(planned, `lesson ${lesson.id} missing from curriculum.ts`).toBeDefined();
      expect(planned?.track).toBe(lesson.track);
    }
  });

  it('orders lessons by curriculum order, not folder order', () => {
    const ids = getLessons().map((l) => l.id);
    const order = curriculum.map((p) => p.id);
    const sorted = [...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    expect(ids).toEqual(sorted);
  });

  it('builds stable step keys and finds exercises by key', () => {
    expect(stepKey('a', 'b')).toBe('a/b');
    for (const lesson of getLessons()) {
      for (const step of lesson.steps) {
        if (step.kind !== 'exercise') continue;
        const found = findExercise(stepKey(lesson.id, step.id));
        expect(found?.step).toBe(step);
        expect(found?.lesson).toBe(lesson);
      }
    }
    expect(findExercise('nope/nope')).toBeUndefined();
    expect(getLesson('nope')).toBeUndefined();
  });

  it('curriculum view has every track and marks planned lessons without modules as unavailable', () => {
    const view = getCurriculumView();
    expect(view.map((v) => v.track.id)).toEqual(tracks.map((t) => t.id));
    const all = view.flatMap((v) => v.lessons);
    expect(all.length).toBe(curriculum.length);
    const locked = all.filter((l) => l.lesson === undefined);
    expect(locked.length).toBeGreaterThan(0);
    for (const l of locked) expect(curriculum.some((p) => p.id === l.planned.id)).toBe(true);
  });

  it('every step id inside a lesson is unique', () => {
    for (const lesson of getLessons()) {
      const ids = lesson.steps.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm vitest run src/content/registry.test.ts`
Expected: FAIL, `./registry` cannot be resolved.

- [ ] **Step 5: Write the registry**

`src/content/registry.ts`:
```ts
import type { ExerciseStep, Lesson, TrackView } from './types';
import { curriculum, tracks } from './curriculum';

const modules = import.meta.glob<{ default: Lesson }>('./lessons/*/lesson.ts', { eager: true });

const byId = new Map<string, Lesson>();
for (const mod of Object.values(modules)) byId.set(mod.default.id, mod.default);

const order = new Map(curriculum.map((p, i) => [p.id, i] as const));

export function getLessons(): Lesson[] {
  return [...byId.values()].sort(
    (a, b) => (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function getLesson(id: string): Lesson | undefined {
  return byId.get(id);
}

export function stepKey(lessonId: string, stepId: string): string {
  return `${lessonId}/${stepId}`;
}

export function findExercise(key: string): { lesson: Lesson; step: ExerciseStep } | undefined {
  const slash = key.indexOf('/');
  if (slash === -1) return undefined;
  const lesson = byId.get(key.slice(0, slash));
  const step = lesson?.steps.find((s) => s.id === key.slice(slash + 1));
  if (!lesson || !step || step.kind !== 'exercise') return undefined;
  return { lesson, step };
}

export function getCurriculumView(): TrackView[] {
  return tracks.map((track) => ({
    track,
    lessons: curriculum
      .filter((p) => p.track === track.id)
      .map((planned) => ({ planned, lesson: byId.get(planned.id) })),
  }));
}
```

- [ ] **Step 6: Run tests**

Run: `pnpm vitest run src/content/registry.test.ts`
Expected: PASS (5 tests; there are zero lessons yet, so per-lesson loops are vacuous but the locked-lessons assertion holds).

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(content): lesson types, curriculum, and glob-based registry" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Sandbox compiler and CommonJS module evaluator

**Files:**
- Create: `src/sandbox/compile.ts`, `src/sandbox/compile.test.ts`, `src/sandbox/modules.ts`, `src/sandbox/modules.test.ts`

**Interfaces:**
- Produces:
  - `compileFile(filename: string, source: string): string` (CJS output) and `class CompileError extends Error { filename; line?; column? }`.
  - `type ModuleRegistry = Record<string, unknown>`; `type UserFiles = Record<string, string>`.
  - `evaluate(files: UserFiles, entry: string, registry: ModuleRegistry): Record<string, unknown>` (returns the entry module's exports; throws `CompileError` or `ModuleNotFoundError`).
  - `class ModuleNotFoundError extends Error { specifier; from }`.
  - `esm<T extends object>(ns: T): T & { __esModule: true }` helper for registry entries.

- [ ] **Step 1: Write the failing compile test**

`src/sandbox/compile.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { compileFile, CompileError } from './compile';

describe('compileFile', () => {
  it('strips types and lowers JSX to the automatic dev runtime as CommonJS', () => {
    const out = compileFile('App.tsx', `
      import { useState } from 'react';
      export default function App(): JSX.Element { const [n] = useState<number>(0); return <p>{n}</p>; }
    `);
    expect(out).toContain("require('react')");
    expect(out).toContain('react/jsx-dev-runtime');
    expect(out).toContain('exports.default');
    expect(out).not.toContain('useState<number>');
  });

  it('throws CompileError with filename and location on a syntax error', () => {
    try {
      compileFile('Broken.tsx', 'export default function () { return <p>oops</span>; }');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(CompileError);
      const err = e as CompileError;
      expect(err.filename).toBe('Broken.tsx');
      expect(err.line).toBeGreaterThan(0);
      expect(err.message).toMatch(/Broken\.tsx/);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/sandbox/compile.test.ts`
Expected: FAIL, module `./compile` not found.

- [ ] **Step 3: Implement compile.ts**

```ts
import { transform } from 'sucrase';

export class CompileError extends Error {
  constructor(
    public readonly filename: string,
    message: string,
    public readonly line?: number,
    public readonly column?: number,
  ) {
    super(`${filename}${line ? `:${line}${column !== undefined ? `:${column}` : ''}` : ''}: ${message}`);
    this.name = 'CompileError';
  }
}

type SucraseLikeError = Error & { loc?: { line: number; column: number } };

/** Compile one TS/TSX source file to CommonJS using the automatic (dev) JSX runtime. */
export function compileFile(filename: string, source: string): string {
  try {
    return transform(source, {
      transforms: ['typescript', 'jsx', 'imports'],
      jsxRuntime: 'automatic',
      production: false,
      filePath: filename,
      disableESTransforms: true,
    }).code;
  } catch (e) {
    const err = e as SucraseLikeError;
    // Sucrase messages look like "Unexpected token (3:14)"; strip the trailing location since we format it ourselves.
    const message = err.message.replace(/\s*\(\d+:\d+\)\s*$/, '');
    throw new CompileError(filename, message, err.loc?.line, err.loc?.column);
  }
}
```

- [ ] **Step 4: Run compile tests**

Run: `pnpm vitest run src/sandbox/compile.test.ts`
Expected: PASS. If the `loc` assertion fails because Sucrase does not attach `loc`, parse the `(line:col)` from the message instead with `/\((\d+):(\d+)\)\s*$/` and keep the test.

- [ ] **Step 5: Write the failing modules test**

`src/sandbox/modules.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { evaluate, ModuleNotFoundError, esm } from './modules';
import { CompileError } from './compile';

const registry = {
  'fake-lib': esm({ default: () => 'default!', named: 42 }),
};

describe('evaluate', () => {
  it('evaluates the entry and returns its exports', () => {
    const mod = evaluate({ 'index.ts': 'export const answer = 6 * 7; export default "hi";' }, 'index.ts', registry);
    expect(mod.answer).toBe(42);
    expect(mod.default).toBe('hi');
  });

  it('resolves relative imports with and without extensions, including nested folders', () => {
    const mod = evaluate(
      {
        'App.tsx': "import { a } from './lib/a'; import b from './b.ts'; export const sum = a + b;",
        'lib/a.ts': "import { base } from '../base'; export const a = base + 1;",
        'base.ts': 'export const base = 10;',
        'b.ts': 'export default 5;',
      },
      'App.tsx',
      registry,
    );
    expect(mod.sum).toBe(16);
  });

  it('resolves registry modules with ESM interop for default and named imports', () => {
    const mod = evaluate(
      { 'x.ts': "import d, { named } from 'fake-lib'; import * as ns from 'fake-lib'; export const r = [d(), named, ns.named];" },
      'x.ts',
      registry,
    );
    expect(mod.r).toEqual(['default!', 42, 42]);
  });

  it('caches modules so shared state is a singleton within one evaluation', () => {
    const mod = evaluate(
      {
        'entry.ts': "import { bump } from './counter'; import './side'; export const n = bump();",
        'side.ts': "import { bump } from './counter'; bump();",
        'counter.ts': 'let c = 0; export function bump() { return ++c; }',
      },
      'entry.ts',
      registry,
    );
    expect(mod.n).toBe(2);
  });

  it('throws a helpful ModuleNotFoundError listing what is available', () => {
    try {
      evaluate({ 'a.ts': "import x from 'lodash'; export default x;" }, 'a.ts', registry);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ModuleNotFoundError);
      const err = e as ModuleNotFoundError;
      expect(err.specifier).toBe('lodash');
      expect(err.from).toBe('a.ts');
      expect(err.message).toContain('fake-lib');
      expect(err.message).toContain('a.ts');
    }
  });

  it('propagates CompileError from any file', () => {
    expect(() => evaluate({ 'a.ts': "import './b'; export {}", 'b.ts': 'const = 1;' }, 'a.ts', registry)).toThrow(CompileError);
  });

  it('throws if the entry file does not exist', () => {
    expect(() => evaluate({ 'a.ts': 'export {}' }, 'App.tsx', registry)).toThrow(/entry/i);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `pnpm vitest run src/sandbox/modules.test.ts`
Expected: FAIL, `./modules` not found.

- [ ] **Step 7: Implement modules.ts**

```ts
import { compileFile } from './compile';

export type ModuleRegistry = Record<string, unknown>;
export type UserFiles = Record<string, string>;

export class ModuleNotFoundError extends Error {
  constructor(
    public readonly specifier: string,
    public readonly from: string,
    available: string[],
  ) {
    super(
      `Cannot find module '${specifier}' (imported from ${from}).\n` +
        `This sandbox provides: ${available.join(', ')}.`,
    );
    this.name = 'ModuleNotFoundError';
  }
}

/** Mark a module namespace so Sucrase's interop helpers treat it as ESM (default import -> ns.default). */
export function esm<T extends object>(ns: T): T & { __esModule: true } {
  return { __esModule: true, ...ns } as T & { __esModule: true };
}

const EXTENSIONS = ['', '.tsx', '.ts', '.jsx', '.js', '/index.tsx', '/index.ts'];

function normalize(path: string): string {
  const parts: string[] = [];
  for (const seg of path.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

function dirname(filename: string): string {
  const i = filename.lastIndexOf('/');
  return i === -1 ? '' : filename.slice(0, i);
}

export function resolveUserFile(from: string, specifier: string, files: UserFiles): string | undefined {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return undefined;
  const base = normalize(`${dirname(from)}/${specifier}`);
  for (const ext of EXTENSIONS) {
    const candidate = base + ext;
    if (candidate in files) return candidate;
  }
  return undefined;
}

type CjsModule = { exports: Record<string, unknown> };

/**
 * Compile and evaluate `entry` (and everything it imports) as CommonJS.
 * User files resolve relative to the importing file; bare specifiers resolve from `registry`.
 */
export function evaluate(files: UserFiles, entry: string, registry: ModuleRegistry): Record<string, unknown> {
  if (!(entry in files)) throw new Error(`Entry file '${entry}' not found. Files: ${Object.keys(files).join(', ')}`);
  const cache = new Map<string, CjsModule>();
  const available = [...Object.keys(registry), ...Object.keys(files).map((f) => `./${f}`)];

  function load(filename: string): Record<string, unknown> {
    const cached = cache.get(filename);
    if (cached) return cached.exports;
    const module: CjsModule = { exports: {} };
    cache.set(filename, module); // set before executing to support cycles
    const code = compileFile(filename, files[filename] ?? '');
    const require = (specifier: string): unknown => {
      const local = resolveUserFile(filename, specifier, files);
      if (local) return load(local);
      if (specifier in registry) return registry[specifier];
      throw new ModuleNotFoundError(specifier, filename, available);
    };
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- this IS the sandbox's job
    const fn = new Function('require', 'module', 'exports', `${code}\n//# sourceURL=sandbox:///${filename}`);
    fn(require, module, module.exports);
    return module.exports;
  }

  return load(entry);
}
```

- [ ] **Step 8: Run all sandbox tests and typecheck**

Run: `pnpm vitest run src/sandbox`
Expected: PASS (9 tests).

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(sandbox): Sucrase TSX compiler and CommonJS evaluator with registry interop" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Simulated server modules and the base module registry

**Files:**
- Create: `src/sandbox/server/core.ts`, `src/sandbox/server/core.test.ts`, `src/sandbox/server/todos.ts`, `src/sandbox/server/users.ts`, `src/sandbox/server/posts.ts`, `src/sandbox/registry.ts`

**Interfaces:**
- Produces:
  - `core.ts`: `serverCall<T>(fn: () => T): Promise<T>`, `controls: ServerControls` (`reset`, `setLatency`, `failNext`), `onReset(fn: () => void): void`, `DEFAULT_LATENCY_MS = 600`.
  - `todos.ts`: `type Todo = { id: number; title: string; done: boolean }`, `getTodos(): Promise<Todo[]>`, `addTodo(title: string): Promise<Todo[]>`, `toggleTodo(id: number): Promise<Todo[]>`.
  - `users.ts`: `type User = { id: number; name: string; bio: string }`, `fetchUser(id: number): Promise<User>`.
  - `posts.ts`: `type Post = { id: number; title: string }`, `fetchPosts(): Promise<Post[]>` (cached promise per reset so `use()` can read it across renders).
  - `registry.ts`: `baseRegistry: ModuleRegistry` containing `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client`, `@server/todos`, `@server/users`, `@server/posts`.
- Consumes: `esm`, `ModuleRegistry` from Task 3; `ServerControls` from Task 2.

- [ ] **Step 1: Write the failing core test**

`src/sandbox/server/core.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { serverCall, controls, onReset } from './core';
import { addTodo, getTodos, toggleTodo } from './todos';
import { fetchPosts } from './posts';

beforeEach(() => {
  controls.reset();
  controls.setLatency(0);
});

describe('serverCall', () => {
  it('resolves with the function result after the configured latency', async () => {
    controls.setLatency(20);
    const start = performance.now();
    await expect(serverCall(() => 'ok')).resolves.toBe('ok');
    expect(performance.now() - start).toBeGreaterThanOrEqual(15);
  });

  it('failNext rejects exactly one call, then recovers', async () => {
    controls.failNext('boom');
    await expect(serverCall(() => 1)).rejects.toThrow('boom');
    await expect(serverCall(() => 1)).resolves.toBe(1);
  });

  it('reset restores default latency and runs registered resetters', () => {
    let ran = 0;
    onReset(() => ran++);
    controls.setLatency(5);
    controls.reset();
    expect(ran).toBe(1);
  });
});

describe('todos', () => {
  it('starts empty, adds, toggles, and resets', async () => {
    expect(await getTodos()).toEqual([]);
    const afterAdd = await addTodo('Walk the dog');
    expect(afterAdd).toEqual([{ id: 1, title: 'Walk the dog', done: false }]);
    const afterToggle = await toggleTodo(1);
    expect(afterToggle[0]?.done).toBe(true);
    controls.reset();
    expect(await getTodos()).toEqual([]);
  });

  it('rejects blank titles', async () => {
    await expect(addTodo('   ')).rejects.toThrow(/required/i);
  });
});

describe('posts', () => {
  it('returns the same promise until reset so use() can read it across renders', async () => {
    const p1 = fetchPosts();
    expect(fetchPosts()).toBe(p1);
    expect((await p1).length).toBeGreaterThan(0);
    controls.reset();
    expect(fetchPosts()).not.toBe(p1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/sandbox/server`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement core.ts**

```ts
import type { ServerControls } from '../../content/types';

export const DEFAULT_LATENCY_MS = 600;

let latencyMs = DEFAULT_LATENCY_MS;
let pendingFailure: string | null = null;
const resetters: Array<() => void> = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Run `fn` "on the server": after artificial latency, honoring a one-shot forced failure. */
export async function serverCall<T>(fn: () => T): Promise<T> {
  await sleep(latencyMs);
  if (pendingFailure !== null) {
    const message = pendingFailure;
    pendingFailure = null;
    throw new Error(message);
  }
  return fn();
}

/** Register a function that restores a server module's in-memory state. */
export function onReset(fn: () => void): void {
  resetters.push(fn);
}

export const controls: ServerControls = {
  reset() {
    latencyMs = DEFAULT_LATENCY_MS;
    pendingFailure = null;
    for (const fn of resetters) fn();
  },
  setLatency(ms) {
    latencyMs = Math.max(0, ms);
  },
  failNext(message = 'The server returned an error') {
    pendingFailure = message;
  },
};
```

- [ ] **Step 4: Implement todos.ts, users.ts, posts.ts**

`todos.ts`:
```ts
import { onReset, serverCall } from './core';

export type Todo = { id: number; title: string; done: boolean };

let todos: Todo[] = [];
let nextId = 1;

onReset(() => {
  todos = [];
  nextId = 1;
});

/** In a real app this would be a Server Function. Returns the full list after the change. */
export function getTodos(): Promise<Todo[]> {
  return serverCall(() => [...todos]);
}

export function addTodo(title: string): Promise<Todo[]> {
  return serverCall(() => {
    const trimmed = title.trim();
    if (!trimmed) throw new Error('Title is required');
    todos = [...todos, { id: nextId++, title: trimmed, done: false }];
    return [...todos];
  });
}

export function toggleTodo(id: number): Promise<Todo[]> {
  return serverCall(() => {
    todos = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    return [...todos];
  });
}
```

`users.ts`:
```ts
import { serverCall } from './core';

export type User = { id: number; name: string; bio: string };

const users: Record<number, User> = {
  1: { id: 1, name: 'Ada Lovelace', bio: 'Wrote the first algorithm intended for a machine.' },
  2: { id: 2, name: 'Grace Hopper', bio: 'Built the first compiler and popularized machine-independent languages.' },
};

export function fetchUser(id: number): Promise<User> {
  return serverCall(() => {
    const user = users[id];
    if (!user) throw new Error(`No user with id ${id}`);
    return user;
  });
}
```

`posts.ts`:
```ts
import { onReset, serverCall } from './core';

export type Post = { id: number; title: string };

const posts: Post[] = [
  { id: 1, title: 'Why state is a snapshot' },
  { id: 2, title: 'Transitions keep the UI responsive' },
  { id: 3, title: 'Suspense is a boundary, not a spinner' },
];

let cached: Promise<Post[]> | null = null;
onReset(() => {
  cached = null;
});

/**
 * Returns a cached promise so `use(fetchPosts())` reads the same promise on every render.
 * Creating a new promise during each render would suspend forever.
 */
export function fetchPosts(): Promise<Post[]> {
  cached ??= serverCall(() => [...posts]);
  return cached;
}
```

- [ ] **Step 5: Implement registry.ts**

```ts
import * as React from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import * as JsxDevRuntime from 'react/jsx-dev-runtime';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as Todos from './server/todos';
import * as Users from './server/users';
import * as Posts from './server/posts';
import { esm, type ModuleRegistry } from './modules';

/** Everything user code may import. Same instances as the host, so hooks and roots work. */
export const baseRegistry: ModuleRegistry = {
  react: esm(React),
  'react/jsx-runtime': esm(JsxRuntime),
  'react/jsx-dev-runtime': esm(JsxDevRuntime),
  'react-dom': esm(ReactDOM),
  'react-dom/client': esm(ReactDOMClient),
  '@server/todos': esm(Todos),
  '@server/users': esm(Users),
  '@server/posts': esm(Posts),
};
```

Add a test to `src/sandbox/modules.test.ts` proving React works through the registry:
```ts
import { baseRegistry } from './registry';
// ...
it('runs real React through the registry (default and named imports)', () => {
  const mod = evaluate(
    { 'App.tsx': "import React, { useState } from 'react'; export default function App() { const [n] = useState(1); return <p>{n}</p>; } export const version = React.version;" },
    'App.tsx',
    baseRegistry,
  );
  expect(typeof mod.default).toBe('function');
  expect(String(mod.version)).toMatch(/^19\./);
});
```

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm vitest run src/sandbox`
Expected: PASS. If the `React.version` assertion fails because `esm(React).default` is undefined in Node, change `esm` to fall back: `default: 'default' in ns ? ns.default : ns` (i.e. `return { __esModule: true, default: ns, ...ns }` with the spread last so a real `default` wins). Keep that behavior in both environments.

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(sandbox): simulated server modules and base module registry" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 5: Check runner shared by the iframe and Vitest

**Files:**
- Create: `src/sandbox/protocol.ts`, `src/sandbox/runner.ts`, `src/sandbox/runner.test.ts`

**Interfaces:**
- Produces:
  - `protocol.ts`: `CheckResult = { name: string; status: 'pass' | 'fail'; error?: string; durationMs: number }`; `ParentToFrame`, `FrameToParent` message unions; `PREVIEW_PATH = '/preview.html'`.
  - `runner.ts`: `runChecks(opts: { files: UserFiles; entry?: string; checks: Check[]; registry: ModuleRegistry; timeoutMs?: number }): Promise<RunChecksOutcome>` where `RunChecksOutcome = { kind: 'compile-error'; error: CompileError | ModuleNotFoundError } | { kind: 'results'; results: CheckResult[]; allPassed: boolean }`. Also `getComponent(mod): ComponentType` and `formatError(e: unknown): string`.
- Consumes: `evaluate`, `UserFiles`, `ModuleRegistry`, `CompileError`, `ModuleNotFoundError` (Task 3); `controls` (Task 4); `Check`, `CheckContext` (Task 2).

- [ ] **Step 1: Write protocol.ts**

```ts
import type { UserFiles } from './modules';

export const PREVIEW_PATH = '/preview.html';

export type CheckResult = {
  name: string;
  status: 'pass' | 'fail';
  error?: string;
  durationMs: number;
};

export type RunMode = 'preview' | 'checks';

export type ParentToFrame = {
  type: 'run';
  runId: number;
  exerciseKey: string;   // `${lessonId}/${stepId}`, used by the iframe to find checks
  files: UserFiles;
  entry: string;
  mode: RunMode;
};

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error';

export type FrameToParent =
  | { type: 'ready' }
  | { type: 'preview-ok'; runId: number }
  | { type: 'compile-error'; runId: number; message: string; filename?: string; line?: number; column?: number }
  | { type: 'runtime-error'; runId: number; message: string }
  | { type: 'console'; level: ConsoleLevel; args: string[] }
  | { type: 'check-results'; runId: number; results: CheckResult[]; allPassed: boolean };

export function isFrameToParent(data: unknown): data is FrameToParent {
  return typeof data === 'object' && data !== null && 'type' in data && typeof (data as { type: unknown }).type === 'string';
}
```

- [ ] **Step 2: Write the failing runner test**

`src/sandbox/runner.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { runChecks } from './runner';
import { baseRegistry } from './registry';
import type { Check } from '../content/types';

const counterFiles = {
  'App.tsx': `
    import { useState } from 'react';
    export default function App() {
      const [n, setN] = useState(0);
      return <button onClick={() => setN(n + 1)}>Count {n}</button>;
    }
  `,
};

const checks: Check[] = [
  {
    name: 'renders 0',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByRole('button').textContent).to.equal('Count 0');
    },
  },
  {
    name: 'increments',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button'));
      expect(screen.getByRole('button').textContent).to.equal('Count 1');
    },
  },
  {
    name: 'a failing assertion',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByRole('button').textContent).to.equal('nope');
    },
  },
];

describe('runChecks', () => {
  it('runs each check in isolation and reports pass/fail with messages', async () => {
    const out = await runChecks({ files: counterFiles, checks, registry: baseRegistry });
    expect(out.kind).toBe('results');
    if (out.kind !== 'results') return;
    expect(out.results.map((r) => r.status)).toEqual(['pass', 'pass', 'fail']);
    expect(out.results[2]?.error).toContain('nope');
    expect(out.allPassed).toBe(false);
    expect(document.body.innerHTML).toBe(''); // cleaned up between and after checks
  });

  it('reports compile errors instead of results', async () => {
    const out = await runChecks({ files: { 'App.tsx': 'export default function App() { return <p>; }' }, checks, registry: baseRegistry });
    expect(out.kind).toBe('compile-error');
  });

  it('reports unknown imports as compile errors', async () => {
    const out = await runChecks({ files: { 'App.tsx': "import x from 'lodash'; export default () => null;" }, checks, registry: baseRegistry });
    expect(out.kind).toBe('compile-error');
    if (out.kind === 'compile-error') expect(out.error.message).toContain('lodash');
  });

  it('fails a check that exceeds the timeout', async () => {
    const slow: Check[] = [{ name: 'hangs', run: () => new Promise(() => {}) }];
    const out = await runChecks({ files: counterFiles, checks: slow, registry: baseRegistry, timeoutMs: 50 });
    if (out.kind !== 'results') throw new Error('expected results');
    expect(out.results[0]?.status).toBe('fail');
    expect(out.results[0]?.error).toMatch(/timed out/i);
  });

  it('evaluates the module lazily per check so server config applies first', async () => {
    const files = {
      'App.tsx': `
        import { fetchUser } from '@server/users';
        export const started = performance.now();
        export const p = fetchUser(1);
        export default function App() { return null; }
      `,
    };
    const timing: Check[] = [
      {
        name: 'latency set before evaluation is honored',
        run: async ({ server, mod, expect }) => {
          server.setLatency(30);
          const t0 = performance.now();
          await (mod.p as Promise<unknown>);
          expect(performance.now() - t0).to.be.greaterThanOrEqual(25);
        },
      },
    ];
    const out = await runChecks({ files, checks: timing, registry: baseRegistry });
    if (out.kind !== 'results') throw new Error('expected results');
    expect(out.results[0]).toMatchObject({ status: 'pass' });
  });

  it('a runtime error during render is reported as a failed check, not a crash', async () => {
    const files = { 'App.tsx': 'export default function App() { throw new Error("kaboom"); }' };
    const c: Check[] = [{ name: 'renders', run: ({ render, Component }) => { render(<Component />); } }];
    const out = await runChecks({ files, checks: c, registry: baseRegistry });
    if (out.kind !== 'results') throw new Error('expected results');
    expect(out.results[0]?.status).toBe('fail');
    expect(out.results[0]?.error).toContain('kaboom');
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm vitest run src/sandbox/runner.test.ts`
Expected: FAIL, `./runner` not found.

- [ ] **Step 4: Implement runner.ts**

```ts
import { act, type ComponentType } from 'react';
import { cleanup, render } from '@testing-library/react';
import { screen, within } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { expect } from 'chai';
import type { Check, CheckContext } from '../content/types';
import { CompileError } from './compile';
import { evaluate, ModuleNotFoundError, type ModuleRegistry, type UserFiles } from './modules';
import { controls } from './server/core';
import type { CheckResult } from './protocol';

export type RunChecksOutcome =
  | { kind: 'compile-error'; error: CompileError | ModuleNotFoundError }
  | { kind: 'results'; results: CheckResult[]; allPassed: boolean };

export function getComponent(mod: Record<string, unknown>): ComponentType {
  const candidate = mod.default ?? mod.App;
  if (typeof candidate !== 'function') {
    throw new Error("Your entry file must `export default` a component (or export one named `App`).");
  }
  return candidate as ComponentType;
}

export function formatError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Check timed out after ${ms}ms. Is something awaiting forever, or looping?`)),
      ms,
    );
    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (err: unknown) => { clearTimeout(timer); reject(err); },
    );
  });
}

declare global {
  // eslint-disable-next-line no-var -- React reads this global
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** Silence React's error-boundary console noise while a check intentionally throws. */
function quietConsoleError<T>(fn: () => Promise<T>): Promise<T> {
  const original = console.error;
  console.error = () => {};
  return fn().finally(() => { console.error = original; });
}

export async function runChecks(opts: {
  files: UserFiles;
  entry?: string;
  checks: Check[];
  registry: ModuleRegistry;
  timeoutMs?: number;
}): Promise<RunChecksOutcome> {
  const entry = opts.entry ?? 'App.tsx';
  const timeoutMs = opts.timeoutMs ?? 5000;

  // Compile everything once up front so syntax/import errors surface before any check runs.
  try {
    evaluate(opts.files, entry, opts.registry);
  } catch (e) {
    if (e instanceof CompileError || e instanceof ModuleNotFoundError) return { kind: 'compile-error', error: e };
    // A runtime error at module top level is a check failure, handled below per check.
  }

  const previousActEnv = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const results: CheckResult[] = [];

  try {
    for (const check of opts.checks) {
      controls.reset();
      controls.setLatency(0);
      let evaluated: Record<string, unknown> | null = null;
      const ctx: CheckContext = {
        get mod() {
          evaluated ??= evaluate(opts.files, entry, opts.registry);
          return evaluated;
        },
        get Component() {
          return getComponent(this.mod);
        },
        render,
        screen,
        within,
        user: userEvent.setup(),
        act,
        expect,
        server: controls,
        sleep,
      };
      const started = performance.now();
      try {
        await withTimeout(quietConsoleError(async () => { await check.run(ctx); }), timeoutMs);
        results.push({ name: check.name, status: 'pass', durationMs: performance.now() - started });
      } catch (e) {
        results.push({ name: check.name, status: 'fail', error: formatError(e), durationMs: performance.now() - started });
      } finally {
        cleanup();
      }
    }
  } finally {
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnv;
    controls.reset();
  }

  return { kind: 'results', results, allPassed: results.every((r) => r.status === 'pass') };
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm vitest run src/sandbox/runner.test.ts`
Expected: PASS (6 tests). Known adjustments if needed:
- If `user.click` warns about `act`, that is fine; only failures matter.
- If `document.body.innerHTML` is not empty after cleanup because user-event leaves nothing but React leaves a container, ensure `cleanup()` runs; RTL removes containers it created.
- The runtime-error test relies on React rethrowing render errors from `render()` when there is no error boundary; RTL's `render` wraps in `act`, which rethrows. If React 19 instead logs and recovers, wrap the user's component in a tiny error-boundary class inside `getComponent`-using code? No: keep the test, and if it fails, change the check-side behavior by having `render` throw via `act` semantics. Investigate before altering the test.

Run: `pnpm typecheck`
Expected: PASS. If `chai`'s `expect` type is not importable as a value type via `typeof chaiExpect` in `types.ts`, change `types.ts` to `import type { ExpectStatic } from 'chai'` and use `expect: ExpectStatic`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(sandbox): typed postMessage protocol and isolated check runner" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Progress persistence (Vite plugin + external store)

**Files:**
- Create: `vite-plugin-progress.ts`, `vite-plugin-progress.test.ts`, `progress/progress.json`, `src/app/progress/types.ts`, `src/app/progress/store.ts`, `src/app/progress/store.test.ts`, `src/app/progress/backends.ts`, `src/app/progress/useProgress.ts`
- Modify: `vite.config.ts` (register plugin)

**Interfaces:**
- Produces:
  - `Progress` type, `emptyProgress()`, `isProgress(x): x is Progress`.
  - `createProgressStore(backend, opts?)` returning `ProgressStore` with `getSnapshot()`, `getSaveState()`, `subscribe(cb)`, `load()`, `completeStep(key)`, `uncompleteStep(key)`, `saveCode(key, files)`, `answerQuiz(key, questionId, choiceId)`, `setLastVisited(path)`, `replace(progress)`, `retrySave()`, `flush()`.
  - `SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error'`.
  - Hooks: `useProgress(): Progress`, `useSaveState(): SaveState`, `progressStore` singleton, `useStepDone(key): boolean`.
  - `createProgressHandler(io)` for the Vite plugin, `progressPlugin(): Plugin`.
- Consumes: nothing from earlier tasks.

- [ ] **Step 1: Write progress types**

`src/app/progress/types.ts`:
```ts
export type Progress = {
  version: 1;
  steps: Record<string, { completedAt: string }>;
  code: Record<string, Record<string, string>>;
  quiz: Record<string, Record<string, string>>;
  lastVisited?: string;
};

export function emptyProgress(): Progress {
  return { version: 1, steps: {}, code: {}, quiz: {} };
}

function isStringRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

export function isProgress(x: unknown): x is Progress {
  if (!isStringRecord(x)) return false;
  if (x.version !== 1) return false;
  if (!isStringRecord(x.steps) || !isStringRecord(x.code) || !isStringRecord(x.quiz)) return false;
  if (x.lastVisited !== undefined && typeof x.lastVisited !== 'string') return false;
  return true;
}
```

`progress/progress.json`:
```json
{
  "version": 1,
  "steps": {},
  "code": {},
  "quiz": {}
}
```

- [ ] **Step 2: Write the failing plugin handler test**

`vite-plugin-progress.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createProgressHandler } from './vite-plugin-progress';

function fakeIo(initial: string | null) {
  let file = initial;
  return {
    io: {
      read: async () => file,
      write: async (text: string) => { file = text; },
    },
    current: () => file,
  };
}

describe('progress handler', () => {
  it('GET returns the empty shape when no file exists', async () => {
    const { io } = fakeIo(null);
    const res = await createProgressHandler(io)('GET', '');
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ version: 1, steps: {}, code: {}, quiz: {} });
  });

  it('GET returns the stored file', async () => {
    const stored = JSON.stringify({ version: 1, steps: { 'a/b': { completedAt: 'x' } }, code: {}, quiz: {} });
    const { io } = fakeIo(stored);
    const res = await createProgressHandler(io)('GET', '');
    expect(JSON.parse(res.body).steps['a/b'].completedAt).toBe('x');
  });

  it('PUT validates and writes pretty JSON', async () => {
    const { io, current } = fakeIo(null);
    const body = JSON.stringify({ version: 1, steps: {}, code: { k: { 'App.tsx': 'x' } }, quiz: {}, lastVisited: '/x' });
    const res = await createProgressHandler(io)('PUT', body);
    expect(res.status).toBe(204);
    expect(current()).toContain('\n  "version": 1');
    expect(JSON.parse(current() ?? '{}').code.k['App.tsx']).toBe('x');
  });

  it('PUT rejects invalid shapes and malformed JSON', async () => {
    const { io, current } = fakeIo(null);
    const handler = createProgressHandler(io);
    expect((await handler('PUT', '{"version":2}')).status).toBe(400);
    expect((await handler('PUT', 'not json')).status).toBe(400);
    expect(current()).toBeNull();
  });

  it('other methods are 405', async () => {
    const { io } = fakeIo(null);
    expect((await createProgressHandler(io)('DELETE', '')).status).toBe(405);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm vitest run vite-plugin-progress.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement the plugin**

`vite-plugin-progress.ts`:
```ts
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

// Duplicated (not imported) from src/app/progress/types.ts so this file stays in the node tsconfig project.
type Progress = {
  version: 1;
  steps: Record<string, unknown>;
  code: Record<string, unknown>;
  quiz: Record<string, unknown>;
  lastVisited?: string;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isProgress(x: unknown): x is Progress {
  return (
    isRecord(x) &&
    x.version === 1 &&
    isRecord(x.steps) &&
    isRecord(x.code) &&
    isRecord(x.quiz) &&
    (x.lastVisited === undefined || typeof x.lastVisited === 'string')
  );
}

const EMPTY = '{\n  "version": 1,\n  "steps": {},\n  "code": {},\n  "quiz": {}\n}\n';

export type ProgressIo = {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
};

export type HandlerResult = { status: number; body: string };

export function createProgressHandler(io: ProgressIo) {
  return async (method: string, body: string): Promise<HandlerResult> => {
    if (method === 'GET') {
      const text = await io.read();
      return { status: 200, body: text ?? EMPTY };
    }
    if (method === 'PUT') {
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        return { status: 400, body: 'Malformed JSON' };
      }
      if (!isProgress(parsed)) return { status: 400, body: 'Invalid progress shape' };
      await io.write(`${JSON.stringify(parsed, null, 2)}\n`);
      return { status: 204, body: '' };
    }
    return { status: 405, body: 'Method not allowed' };
  };
}

function fileIo(path: string): ProgressIo {
  return {
    async read() {
      try {
        return await readFile(path, 'utf8');
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw e;
      }
    },
    async write(text) {
      await mkdir(dirname(path), { recursive: true });
      const tmp = `${path}.tmp`;
      await writeFile(tmp, text, 'utf8');
      await rename(tmp, path); // atomic on the same volume
    },
  };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => { data += chunk; });
    req.on('end', () => resolvePromise(data));
    req.on('error', reject);
  });
}

export function progressPlugin(options: { file?: string } = {}): Plugin {
  const relative = options.file ?? 'progress/progress.json';
  return {
    name: 'react-refresher-progress',
    configureServer(server) {
      const handler = createProgressHandler(fileIo(resolve(server.config.root, relative)));
      server.middlewares.use('/__progress', (req: IncomingMessage, res: ServerResponse, next) => {
        void (async () => {
          try {
            const body = req.method === 'PUT' ? await readBody(req) : '';
            const result = await handler(req.method ?? 'GET', body);
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

Register in `vite.config.ts`: add `import { progressPlugin } from './vite-plugin-progress';` and `plugins: [react({ compiler: true }), tailwindcss(), progressPlugin()]`.

- [ ] **Step 5: Run plugin tests**

Run: `pnpm vitest run vite-plugin-progress.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Write the failing store test**

`src/app/progress/store.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createProgressStore } from './store';
import { emptyProgress, type Progress } from './types';

function fakeBackend(initial: Progress = emptyProgress()) {
  const saves: Progress[] = [];
  let failNext = false;
  return {
    saves,
    failNext: () => { failNext = true; },
    backend: {
      load: vi.fn(async () => structuredClone(initial)),
      save: vi.fn(async (p: Progress) => {
        if (failNext) { failNext = false; throw new Error('disk full'); }
        saves.push(structuredClone(p));
      }),
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('progress store', () => {
  it('loads from the backend and exposes a snapshot', async () => {
    const seed = { ...emptyProgress(), steps: { 'a/b': { completedAt: 't' } } };
    const { backend } = fakeBackend(seed);
    const store = createProgressStore(backend);
    expect(store.getSaveState()).toBe('loading');
    await store.load();
    expect(store.getSnapshot().steps['a/b']).toEqual({ completedAt: 't' });
    expect(store.getSaveState()).toBe('idle');
  });

  it('updates optimistically, notifies subscribers, and debounces saves into one write', async () => {
    const { backend, saves } = fakeBackend();
    const store = createProgressStore(backend, { debounceMs: 100, now: () => '2026-09-17T00:00:00.000Z' });
    await store.load();
    const listener = vi.fn();
    store.subscribe(listener);

    store.completeStep('l/s1');
    store.saveCode('l/ex', { 'App.tsx': 'v1' });
    store.saveCode('l/ex', { 'App.tsx': 'v2' });
    store.answerQuiz('l/q', 'q1', 'b');
    store.setLastVisited('/lesson/l/2');

    expect(listener).toHaveBeenCalled();
    expect(store.getSnapshot().steps['l/s1']?.completedAt).toBe('2026-09-17T00:00:00.000Z');
    expect(store.getSnapshot().code['l/ex']).toEqual({ 'App.tsx': 'v2' });
    expect(store.getSnapshot().quiz['l/q']).toEqual({ q1: 'b' });
    expect(store.getSnapshot().lastVisited).toBe('/lesson/l/2');
    expect(saves.length).toBe(0);
    expect(store.getSaveState()).toBe('saving');

    await vi.advanceTimersByTimeAsync(100);
    expect(saves.length).toBe(1);
    expect(saves[0]?.code['l/ex']).toEqual({ 'App.tsx': 'v2' });
    expect(store.getSaveState()).toBe('saved');
  });

  it('snapshot identity is stable when nothing changed (useSyncExternalStore friendly)', async () => {
    const { backend } = fakeBackend();
    const store = createProgressStore(backend);
    await store.load();
    const a = store.getSnapshot();
    store.completeStep('x/y');
    store.completeStep('x/y'); // already complete: must not create a new snapshot
    const b = store.getSnapshot();
    expect(a).not.toBe(b);
    store.completeStep('x/y');
    expect(store.getSnapshot()).toBe(b);
  });

  it('marks error on save failure, keeps local state, and retrySave recovers', async () => {
    const { backend, saves, failNext } = fakeBackend();
    const store = createProgressStore(backend, { debounceMs: 10 });
    await store.load();
    failNext();
    store.completeStep('a/b');
    await vi.advanceTimersByTimeAsync(10);
    expect(store.getSaveState()).toBe('error');
    expect(store.getSnapshot().steps['a/b']).toBeDefined();
    store.retrySave();
    await vi.advanceTimersByTimeAsync(10);
    expect(saves.length).toBe(1);
    expect(store.getSaveState()).toBe('saved');
  });

  it('replace() swaps the whole progress (import) and uncompleteStep removes a step', async () => {
    const { backend } = fakeBackend();
    const store = createProgressStore(backend, { debounceMs: 10 });
    await store.load();
    store.replace({ ...emptyProgress(), steps: { 'p/q': { completedAt: 'z' } } });
    expect(store.getSnapshot().steps['p/q']).toBeDefined();
    store.uncompleteStep('p/q');
    expect(store.getSnapshot().steps['p/q']).toBeUndefined();
  });

  it('flush() saves immediately without waiting for the debounce', async () => {
    const { backend, saves } = fakeBackend();
    const store = createProgressStore(backend, { debounceMs: 1000 });
    await store.load();
    store.completeStep('a/b');
    await store.flush();
    expect(saves.length).toBe(1);
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `pnpm vitest run src/app/progress/store.test.ts`
Expected: FAIL, `./store` not found.

- [ ] **Step 8: Implement store.ts**

```ts
import { emptyProgress, type Progress } from './types';

export type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

export type ProgressBackend = {
  load(): Promise<Progress>;
  save(progress: Progress): Promise<void>;
};

export type ProgressStore = {
  getSnapshot(): Progress;
  getSaveState(): SaveState;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  completeStep(key: string): void;
  uncompleteStep(key: string): void;
  saveCode(key: string, files: Record<string, string>): void;
  answerQuiz(key: string, questionId: string, choiceId: string): void;
  setLastVisited(path: string): void;
  replace(progress: Progress): void;
  retrySave(): void;
  flush(): Promise<void>;
};

export function createProgressStore(
  backend: ProgressBackend,
  opts: { debounceMs?: number; now?: () => string } = {},
): ProgressStore {
  const debounceMs = opts.debounceMs ?? 750;
  const now = opts.now ?? (() => new Date().toISOString());

  let progress: Progress = emptyProgress();
  let saveState: SaveState = 'loading';
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  const listeners = new Set<() => void>();

  function emit() {
    for (const l of listeners) l();
  }

  function setSaveState(next: SaveState) {
    if (saveState === next) return;
    saveState = next;
    emit();
  }

  async function persist(): Promise<void> {
    if (timer) { clearTimeout(timer); timer = null; }
    if (!dirty) return;
    dirty = false;
    setSaveState('saving');
    try {
      await backend.save(progress);
      if (!dirty) setSaveState('saved');
    } catch {
      dirty = true;
      setSaveState('error');
    }
  }

  function schedule() {
    dirty = true;
    setSaveState('saving');
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void persist(); }, debounceMs);
  }

  function update(next: Progress) {
    progress = next;
    emit();
    schedule();
  }

  return {
    getSnapshot: () => progress,
    getSaveState: () => saveState,
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async load() {
      setSaveState('loading');
      try {
        progress = await backend.load();
        setSaveState('idle');
      } catch {
        setSaveState('error');
      }
      emit();
    },
    completeStep(key) {
      if (progress.steps[key]) return;
      update({ ...progress, steps: { ...progress.steps, [key]: { completedAt: now() } } });
    },
    uncompleteStep(key) {
      if (!progress.steps[key]) return;
      const { [key]: _removed, ...rest } = progress.steps;
      update({ ...progress, steps: rest });
    },
    saveCode(key, files) {
      update({ ...progress, code: { ...progress.code, [key]: { ...files } } });
    },
    answerQuiz(key, questionId, choiceId) {
      const existing = progress.quiz[key] ?? {};
      if (existing[questionId] === choiceId) return;
      update({ ...progress, quiz: { ...progress.quiz, [key]: { ...existing, [questionId]: choiceId } } });
    },
    setLastVisited(path) {
      if (progress.lastVisited === path) return;
      update({ ...progress, lastVisited: path });
    },
    replace(next) {
      update(structuredClone(next));
    },
    retrySave() {
      dirty = true;
      void persist();
    },
    flush: () => persist(),
  };
}
```

- [ ] **Step 9: Run store tests**

Run: `pnpm vitest run src/app/progress/store.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 10: Write backends and hooks**

`src/app/progress/backends.ts`:
```ts
import { emptyProgress, isProgress, type Progress } from './types';
import type { ProgressBackend } from './store';

const ENDPOINT = '/__progress';
const LS_KEY = 'react-refresher.progress.v1';

export const httpBackend: ProgressBackend = {
  async load() {
    const res = await fetch(ENDPOINT);
    if (!res.ok) throw new Error(`GET ${ENDPOINT} failed: ${res.status}`);
    const data: unknown = await res.json();
    return isProgress(data) ? data : emptyProgress();
  },
  async save(progress) {
    const res = await fetch(ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress),
    });
    if (!res.ok) throw new Error(`PUT ${ENDPOINT} failed: ${res.status}`);
  },
};

export const localStorageBackend: ProgressBackend = {
  async load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const data: unknown = raw ? JSON.parse(raw) : null;
      return isProgress(data) ? data : emptyProgress();
    } catch {
      return emptyProgress();
    }
  },
  async save(progress: Progress) {
    localStorage.setItem(LS_KEY, JSON.stringify(progress));
  },
};

/** Dev server has the file-backed endpoint; a static build falls back to localStorage. */
export function pickBackend(): ProgressBackend {
  return import.meta.env.DEV ? httpBackend : localStorageBackend;
}
```

`src/app/progress/useProgress.ts`:
```ts
import { useSyncExternalStore } from 'react';
import { createProgressStore, type SaveState } from './store';
import { pickBackend } from './backends';
import type { Progress } from './types';

export const progressStore = createProgressStore(pickBackend());

export function useProgress(): Progress {
  return useSyncExternalStore(progressStore.subscribe, progressStore.getSnapshot, progressStore.getSnapshot);
}

export function useSaveState(): SaveState {
  return useSyncExternalStore(progressStore.subscribe, progressStore.getSaveState, progressStore.getSaveState);
}

export function useStepDone(key: string): boolean {
  return useProgress().steps[key] !== undefined;
}
```

- [ ] **Step 11: Typecheck and run everything**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat(progress): file-backed progress via Vite plugin and external store" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Preview iframe entry

**Files:**
- Create: `src/sandbox/preview-main.tsx` (replace stub), `src/sandbox/preview-host.ts`, `src/sandbox/preview-host.test.ts`

**Interfaces:**
- Produces: the iframe page that answers `ParentToFrame` messages with `FrameToParent` messages. Testable core: `createPreviewHost(deps): { handle(msg: ParentToFrame): Promise<void> }` where `deps = { post(msg: FrameToParent): void; registry: ModuleRegistry; findChecks(exerciseKey): Check[] | undefined; mount: HTMLElement }`.
- Consumes: `evaluate`, `baseRegistry`, `runChecks`, `getComponent`, `formatError`, protocol types, `findExercise` (Task 2).

- [ ] **Step 1: Write the failing host test**

`src/sandbox/preview-host.test.ts`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { createPreviewHost } from './preview-host';
import { baseRegistry } from './registry';
import type { FrameToParent, ParentToFrame } from './protocol';
import type { Check } from '../content/types';

function setup(checks: Check[] | undefined = []) {
  const posted: FrameToParent[] = [];
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const host = createPreviewHost({
    post: (m) => posted.push(m),
    registry: baseRegistry,
    findChecks: () => checks,
    mount,
  });
  return { host, posted, mount };
}

const run = (over: Partial<ParentToFrame>): ParentToFrame => ({
  type: 'run', runId: 1, exerciseKey: 'l/e', entry: 'App.tsx', mode: 'preview',
  files: { 'App.tsx': 'export default function App() { return <h1>Hi there</h1>; }' },
  ...over,
});

describe('preview host', () => {
  it('renders the default export into the mount and posts preview-ok', async () => {
    const { host, posted, mount } = setup();
    await host.handle(run({}));
    expect(mount.textContent).toContain('Hi there');
    expect(posted).toContainEqual({ type: 'preview-ok', runId: 1 });
  });

  it('replaces the previous render on the next run', async () => {
    const { host, mount } = setup();
    await host.handle(run({}));
    await host.handle(run({ runId: 2, files: { 'App.tsx': 'export default () => <p>Second</p>;' } }));
    expect(mount.textContent).toBe('Second');
  });

  it('posts compile-error with location for broken code', async () => {
    const { host, posted } = setup();
    await host.handle(run({ files: { 'App.tsx': 'export default function App() { return <p>; }' } }));
    const err = posted.find((m) => m.type === 'compile-error');
    expect(err).toBeDefined();
    if (err?.type === 'compile-error') expect(err.filename).toBe('App.tsx');
  });

  it('posts runtime-error when rendering throws, and shows an error card', async () => {
    const { host, posted, mount } = setup();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await host.handle(run({ files: { 'App.tsx': 'export default function App() { throw new Error("nope"); }' } }));
    spy.mockRestore();
    expect(posted.some((m) => m.type === 'runtime-error' && m.message.includes('nope'))).toBe(true);
    expect(mount.textContent).toContain('nope');
  });

  it('runs checks, posts results, and re-renders the preview afterwards', async () => {
    const checks: Check[] = [
      { name: 'has heading', run: ({ render, screen, expect, Component }) => { render(<Component />); expect(screen.getByRole('heading').textContent).to.equal('Hi there'); } },
    ];
    const { host, posted, mount } = setup(checks);
    await host.handle(run({ mode: 'checks', runId: 7 }));
    const results = posted.find((m) => m.type === 'check-results');
    expect(results).toMatchObject({ type: 'check-results', runId: 7, allPassed: true });
    expect(mount.textContent).toContain('Hi there');
  });

  it('reports an unknown exercise as a failed check result', async () => {
    const { host, posted } = setup(undefined);
    await host.handle(run({ mode: 'checks' }));
    const results = posted.find((m) => m.type === 'check-results');
    expect(results).toMatchObject({ allPassed: false });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/sandbox/preview-host.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement preview-host.ts**

```tsx
import { Component, createElement, type ErrorInfo, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { Check } from '../content/types';
import { CompileError } from './compile';
import { evaluate, ModuleNotFoundError, type ModuleRegistry } from './modules';
import type { FrameToParent, ParentToFrame } from './protocol';
import { formatError, getComponent, runChecks } from './runner';

type Deps = {
  post(msg: FrameToParent): void;
  registry: ModuleRegistry;
  findChecks(exerciseKey: string): Check[] | undefined;
  mount: HTMLElement;
};

type BoundaryProps = { onError(message: string): void; children: ReactNode };
type BoundaryState = { message: string | null };

class PreviewErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { message: null };
  static getDerivedStateFromError(e: unknown): BoundaryState {
    return { message: formatError(e) };
  }
  componentDidCatch(e: unknown, _info: ErrorInfo) {
    this.props.onError(formatError(e));
  }
  render() {
    if (this.state.message !== null) {
      return createElement(
        'div',
        { role: 'alert', style: { border: '1px solid #f87171', color: '#f87171', padding: 12, borderRadius: 8, fontFamily: 'ui-monospace, monospace', fontSize: 13 } },
        createElement('strong', null, 'Runtime error: '),
        this.state.message,
      );
    }
    return this.props.children;
  }
}

export function createPreviewHost(deps: Deps) {
  let root: Root | null = null;

  function unmount() {
    if (root) {
      root.unmount();
      root = null;
    }
  }

  function renderPreview(msg: ParentToFrame): void {
    unmount();
    let element: ReactNode;
    try {
      const mod = evaluate(msg.files, msg.entry, deps.registry);
      const App = getComponent(mod);
      element = createElement(App);
    } catch (e) {
      if (e instanceof CompileError) {
        deps.post({ type: 'compile-error', runId: msg.runId, message: e.message, filename: e.filename, line: e.line, column: e.column });
      } else if (e instanceof ModuleNotFoundError) {
        deps.post({ type: 'compile-error', runId: msg.runId, message: e.message, filename: e.from });
      } else {
        deps.post({ type: 'runtime-error', runId: msg.runId, message: formatError(e) });
      }
      deps.mount.textContent = '';
      const card = document.createElement('pre');
      card.style.cssText = 'color:#f87171;white-space:pre-wrap;font-size:13px';
      card.textContent = formatError(e);
      deps.mount.appendChild(card);
      return;
    }

    root = createRoot(deps.mount);
    let errored = false;
    const onError = (message: string) => {
      errored = true;
      deps.post({ type: 'runtime-error', runId: msg.runId, message });
    };
    // flushSync so a synchronous render error is reported before preview-ok.
    flushSync(() => {
      root?.render(createElement(PreviewErrorBoundary, { onError }, element));
    });
    if (!errored) deps.post({ type: 'preview-ok', runId: msg.runId });
  }

  async function runExerciseChecks(msg: ParentToFrame): Promise<void> {
    unmount(); // checks render into document.body; the preview must not pollute queries
    const checks = deps.findChecks(msg.exerciseKey);
    if (!checks) {
      deps.post({
        type: 'check-results',
        runId: msg.runId,
        allPassed: false,
        results: [{ name: 'exercise found', status: 'fail', error: `No checks registered for '${msg.exerciseKey}'`, durationMs: 0 }],
      });
      renderPreview(msg);
      return;
    }
    const outcome = await runChecks({ files: msg.files, entry: msg.entry, checks, registry: deps.registry });
    if (outcome.kind === 'compile-error') {
      const e = outcome.error;
      deps.post({
        type: 'compile-error',
        runId: msg.runId,
        message: e.message,
        filename: e instanceof CompileError ? e.filename : e.from,
        line: e instanceof CompileError ? e.line : undefined,
        column: e instanceof CompileError ? e.column : undefined,
      });
    } else {
      deps.post({ type: 'check-results', runId: msg.runId, results: outcome.results, allPassed: outcome.allPassed });
    }
    renderPreview(msg);
  }

  return {
    async handle(msg: ParentToFrame): Promise<void> {
      if (msg.type !== 'run') return;
      if (msg.mode === 'preview') renderPreview(msg);
      else await runExerciseChecks(msg);
    },
  };
}
```

- [ ] **Step 4: Run host tests**

Run: `pnpm vitest run src/sandbox/preview-host.test.ts`
Expected: PASS (6 tests). If the runtime-error test fails because the boundary's `componentDidCatch` runs after `flushSync` returns, change `renderPreview` to post `preview-ok` from a `setTimeout(..., 0)` only if `!errored`, and make the test `await new Promise(r => setTimeout(r, 0))` before asserting. Prefer the synchronous path if it works.

- [ ] **Step 5: Implement preview-main.tsx (browser-only glue)**

```tsx
import { baseRegistry } from './registry';
import { findExercise } from '../content/registry';
import { createPreviewHost } from './preview-host';
import type { ConsoleLevel, FrameToParent, ParentToFrame } from './protocol';

// Some libraries probe process.env; the iframe has no bundler define for it.
(globalThis as { process?: unknown }).process ??= { env: {} };

function post(msg: FrameToParent): void {
  window.parent.postMessage(msg, window.location.origin);
}

function serialize(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(arg, null, 2) ?? String(arg);
  } catch {
    return String(arg);
  }
}

for (const level of ['log', 'info', 'warn', 'error'] as ConsoleLevel[]) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) => {
    original(...args);
    post({ type: 'console', level, args: args.map(serialize) });
  };
}

window.addEventListener('error', (e) => post({ type: 'console', level: 'error', args: [`Uncaught: ${e.message}`] }));
window.addEventListener('unhandledrejection', (e) =>
  post({ type: 'console', level: 'error', args: [`Unhandled promise rejection: ${serialize(e.reason)}`] }),
);

const mount = document.getElementById('root');
if (!mount) throw new Error('preview.html is missing #root');

const host = createPreviewHost({
  post,
  registry: baseRegistry,
  findChecks: (key) => findExercise(key)?.step.checks,
  mount,
});

let queue: Promise<void> = Promise.resolve();
window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (event.source !== window.parent) return;
  const data = event.data as Partial<ParentToFrame> | null;
  if (!data || data.type !== 'run') return;
  // Serialize runs so a checks run and a preview run never interleave.
  queue = queue.then(() => host.handle(data as ParentToFrame)).catch((e: unknown) => {
    post({ type: 'runtime-error', runId: (data as ParentToFrame).runId, message: e instanceof Error ? e.message : String(e) });
  });
});

post({ type: 'ready' });
```

- [ ] **Step 6: Manual verification in the browser**

Run: `pnpm dev` (background). Open `http://localhost:5173/preview.html` in a browser; the console should show no errors. In the DevTools console run:

```js
window.postMessage({ type:'run', runId:1, exerciseKey:'x/y', entry:'App.tsx', mode:'preview', files:{ 'App.tsx':'import {useState} from "react"; export default function App(){ const [n,s]=useState(0); return <button onClick={()=>s(n+1)}>n={n}</button>; }' } }, '*')
```
Expected: a button `n=0` appears and increments on click. (The `event.source !== window.parent` guard passes here because a top-level window's `parent` is itself.)

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(sandbox): preview iframe host with error boundary, console forwarding, and check runs" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: App shell: router, layout, theme, dashboard

**Files:**
- Create: `src/app/router.tsx`, `src/app/Layout.tsx`, `src/app/theme.ts`, `src/app/components/Button.tsx`, `src/app/Dashboard.tsx`, `src/app/dashboard-status.ts`, `src/app/dashboard-status.test.ts`, `src/app/LessonPage.tsx` (placeholder that Task 9 fills)
- Modify: `src/main.tsx`

**Interfaces:**
- Produces:
  - `lessonStatus(lesson: Lesson, progress: Progress): 'done' | 'in-progress' | 'available'`; `lessonCompletion(lesson, progress): { done: number; total: number }`; `overallCompletion(lessons, progress): { done: number; total: number; percent: number }`; `firstIncompleteStepIndex(lesson, progress): number`.
  - Routes: `/` Dashboard, `/lesson/:lessonId/:stepIndex?` LessonPage.
  - `Button` component with `variant: 'primary' | 'ghost' | 'danger'`.
  - `getTheme()`, `setTheme(t)`, `toggleTheme()`, `useTheme()`.
- Consumes: registry (Task 2), progress hooks (Task 6).

- [ ] **Step 1: Write the failing status test**

`src/app/dashboard-status.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { lessonStatus, lessonCompletion, overallCompletion, firstIncompleteStepIndex } from './dashboard-status';
import { emptyProgress } from './progress/types';
import type { Lesson } from '../content/types';

const lesson: Lesson = {
  id: 'l1', title: 'L1', track: 'refresher', summary: '',
  steps: [
    { kind: 'concept', id: 'a', title: 'A', markdown: '' },
    { kind: 'quiz', id: 'b', title: 'B', questions: [] },
    { kind: 'concept', id: 'c', title: 'C', markdown: '' },
  ],
};

const done = (...keys: string[]) => ({
  ...emptyProgress(),
  steps: Object.fromEntries(keys.map((k) => [k, { completedAt: 'x' }])),
});

describe('dashboard status', () => {
  it('is available with nothing done, in-progress with some, done with all', () => {
    expect(lessonStatus(lesson, emptyProgress())).toBe('available');
    expect(lessonStatus(lesson, done('l1/a'))).toBe('in-progress');
    expect(lessonStatus(lesson, done('l1/a', 'l1/b', 'l1/c'))).toBe('done');
  });

  it('ignores steps from other lessons', () => {
    expect(lessonStatus(lesson, done('l2/a'))).toBe('available');
  });

  it('counts completion and overall percent', () => {
    expect(lessonCompletion(lesson, done('l1/a'))).toEqual({ done: 1, total: 3 });
    expect(overallCompletion([lesson, { ...lesson, id: 'l2' }], done('l1/a', 'l1/b', 'l1/c'))).toEqual({ done: 3, total: 6, percent: 50 });
    expect(overallCompletion([], emptyProgress()).percent).toBe(0);
  });

  it('finds the first incomplete step, or 0 when all done', () => {
    expect(firstIncompleteStepIndex(lesson, done('l1/a'))).toBe(1);
    expect(firstIncompleteStepIndex(lesson, done('l1/a', 'l1/b', 'l1/c'))).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/app/dashboard-status.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement dashboard-status.ts**

```ts
import type { Lesson } from '../content/types';
import { stepKey } from '../content/registry';
import type { Progress } from './progress/types';

export type LessonStatus = 'done' | 'in-progress' | 'available';

export function lessonCompletion(lesson: Lesson, progress: Progress): { done: number; total: number } {
  const done = lesson.steps.filter((s) => progress.steps[stepKey(lesson.id, s.id)] !== undefined).length;
  return { done, total: lesson.steps.length };
}

export function lessonStatus(lesson: Lesson, progress: Progress): LessonStatus {
  const { done, total } = lessonCompletion(lesson, progress);
  if (total > 0 && done === total) return 'done';
  if (done > 0) return 'in-progress';
  return 'available';
}

export function overallCompletion(lessons: Lesson[], progress: Progress): { done: number; total: number; percent: number } {
  let done = 0;
  let total = 0;
  for (const lesson of lessons) {
    const c = lessonCompletion(lesson, progress);
    done += c.done;
    total += c.total;
  }
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function firstIncompleteStepIndex(lesson: Lesson, progress: Progress): number {
  const i = lesson.steps.findIndex((s) => progress.steps[stepKey(lesson.id, s.id)] === undefined);
  return i === -1 ? 0 : i;
}
```

- [ ] **Step 4: Run status tests**

Run: `pnpm vitest run src/app/dashboard-status.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Theme, Button, Layout, router, main**

`src/app/theme.ts`:
```ts
import { useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';
const KEY = 'react-refresher.theme';
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* private mode etc. */ }
  for (const l of listeners) l();
}

export function toggleTheme(): void {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

export function initTheme(): void {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') document.documentElement.dataset.theme = saved;
  } catch { /* ignore */ }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => 'dark');
}
```

`src/app/components/Button.tsx`:
```tsx
import type { ComponentProps } from 'react';

type Props = ComponentProps<'button'> & { variant?: 'primary' | 'ghost' | 'danger'; size?: 'sm' | 'md' };

const base = 'inline-flex items-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-accent';
const variants = {
  primary: 'bg-accent text-black hover:bg-accent-strong',
  ghost: 'bg-transparent text-ink hover:bg-surface-3 border border-border',
  danger: 'bg-transparent text-danger hover:bg-danger/10 border border-danger/40',
};
const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-2 text-sm' };

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest} />;
}
```

`src/app/Layout.tsx`:
```tsx
import { Link, Outlet } from 'react-router';
import { useSaveState, progressStore } from './progress/useProgress';
import { toggleTheme, useTheme } from './theme';
import { Button } from './components/Button';

function SaveIndicator() {
  const state = useSaveState();
  const label = { idle: '', loading: 'Loading…', saving: 'Saving…', saved: 'Saved', error: 'Save failed' }[state];
  const color = state === 'error' ? 'text-danger' : state === 'saved' ? 'text-success' : 'text-ink-muted';
  return (
    <span className={`text-xs ${color} flex items-center gap-2`} aria-live="polite">
      {label}
      {state === 'error' && (
        <Button size="sm" variant="danger" onClick={() => progressStore.retrySave()}>Retry</Button>
      )}
    </span>
  );
}

export function Layout() {
  const theme = useTheme();
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border bg-surface-2">
        <div className="mx-auto max-w-7xl px-4 h-12 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">
            <span className="text-accent">⚛</span> React Refresher
          </Link>
          <div className="flex items-center gap-4">
            <SaveIndicator />
            <Button size="sm" variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
```

`src/app/LessonPage.tsx` placeholder (Task 9 replaces it):
```tsx
import { useParams } from 'react-router';
export function LessonPage() {
  const { lessonId } = useParams();
  return <p className="p-6">Lesson {lessonId} coming in Task 9.</p>;
}
```

`src/app/router.tsx`:
```tsx
import { createBrowserRouter } from 'react-router';
import { Layout } from './Layout';
import { Dashboard } from './Dashboard';
import { LessonPage } from './LessonPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'lesson/:lessonId/:stepIndex?', Component: LessonPage },
    ],
  },
]);
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import './index.css';
import { router } from './app/router';
import { progressStore } from './app/progress/useProgress';
import { initTheme } from './app/theme';

initTheme();
void progressStore.load();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

- [ ] **Step 6: Dashboard**

`src/app/Dashboard.tsx`:
```tsx
import { useRef } from 'react';
import { Link } from 'react-router';
import { getCurriculumView, getLessons } from '../content/registry';
import type { Lesson, LessonView } from '../content/types';
import { progressStore, useProgress, useSaveState } from './progress/useProgress';
import { isProgress, type Progress } from './progress/types';
import { firstIncompleteStepIndex, lessonCompletion, lessonStatus, overallCompletion } from './dashboard-status';
import { Button } from './components/Button';

function StatusPill({ status }: { status: 'done' | 'in-progress' | 'available' | 'locked' }) {
  const styles = {
    done: 'bg-success/15 text-success',
    'in-progress': 'bg-warning/15 text-warning',
    available: 'bg-accent/15 text-accent',
    locked: 'bg-surface-3 text-ink-muted',
  }[status];
  const label = { done: 'Done', 'in-progress': 'In progress', available: 'Start', locked: 'Coming soon' }[status];
  return <span className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full ${styles}`}>{label}</span>;
}

function LessonCard({ view, progress }: { view: LessonView; progress: Progress }) {
  const { planned, lesson } = view;
  if (!lesson) {
    return (
      <div className="rounded-lg border border-border bg-surface-2 p-4 opacity-70">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium">{planned.title}</h3>
          <StatusPill status="locked" />
        </div>
        <p className="mt-1 text-sm text-ink-muted">{planned.summary}</p>
      </div>
    );
  }
  const status = lessonStatus(lesson, progress);
  const { done, total } = lessonCompletion(lesson, progress);
  const target = `/lesson/${lesson.id}/${firstIncompleteStepIndex(lesson, progress)}`;
  return (
    <Link to={target} className="block rounded-lg border border-border bg-surface-2 p-4 hover:border-accent transition-colors">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium">{lesson.title}</h3>
        <StatusPill status={status} />
      </div>
      <p className="mt-1 text-sm text-ink-muted">{lesson.summary}</p>
      <div className="mt-3 h-1.5 rounded bg-surface-3 overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      <p className="mt-1 text-xs text-ink-muted">{done}/{total} steps</p>
    </Link>
  );
}

function ContinueButton({ lessons, progress }: { lessons: Lesson[]; progress: Progress }) {
  const target = progress.lastVisited ?? (lessons[0] ? `/lesson/${lessons[0].id}/0` : null);
  if (!target) return null;
  return (
    <Link to={target}>
      <Button>Continue where you left off</Button>
    </Link>
  );
}

function ExportImport() {
  const fileInput = useRef<HTMLInputElement>(null);
  const saveState = useSaveState();

  function exportJson() {
    const blob = new Blob([JSON.stringify(progressStore.getSnapshot(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `react-refresher-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    const data: unknown = JSON.parse(await file.text());
    if (!isProgress(data)) {
      window.alert('That file is not a valid progress export.');
      return;
    }
    progressStore.replace(data);
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="ghost" onClick={exportJson} disabled={saveState === 'loading'}>Export progress</Button>
      <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>Import progress</Button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ''; }}
      />
    </div>
  );
}

export function Dashboard() {
  const progress = useProgress();
  const lessons = getLessons();
  const overall = overallCompletion(lessons, progress);
  const view = getCurriculumView();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-10">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Your React path</h1>
          <p className="mt-1 text-ink-muted">
            {overall.done} of {overall.total} steps complete across {lessons.length} playable lessons ({overall.percent}%).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExportImport />
          <ContinueButton lessons={lessons} progress={progress} />
        </div>
      </section>

      {view.map(({ track, lessons: items }) => (
        <section key={track.id}>
          <h2 className="text-lg font-semibold">{track.title}</h2>
          <p className="text-sm text-ink-muted mb-3">{track.description}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => <LessonCard key={item.planned.id} view={item} progress={progress} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Verify in the browser**

Run: `pnpm typecheck && pnpm test` → PASS.
Run: `pnpm dev`, open `http://localhost:5173/`. Expected: header with theme toggle and "Saved"/idle indicator, six track sections, every lesson card marked "Coming soon" (no lessons exist yet). Toggle theme: colors flip and persist on reload. Check the terminal: `GET /__progress` served once.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(app): router, layout with theme and save indicator, curriculum dashboard" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 9: Lesson page, Markdown renderer, concept and quiz steps

**Files:**
- Create: `src/app/components/Markdown.tsx`, `src/app/steps/ConceptStep.tsx`, `src/app/steps/QuizStep.tsx`, `src/app/steps/QuizStep.test.tsx`, `src/app/steps/ExerciseStep.tsx` (placeholder; Task 10 fills it)
- Modify: `src/app/LessonPage.tsx` (replace placeholder)

**Interfaces:**
- Produces:
  - `<Markdown source={string} className?>`.
  - `<ConceptStep step lessonId onComplete />`, `<QuizStep step lessonId />` (uses `progressStore` directly for answers/completion), `<ExerciseStep step lessonId />`.
  - `LessonPage` reads `lessonId`, `stepIndex` params; records `lastVisited`; renders sidebar + step + footer nav.
- Consumes: registry, progress hooks/store, Button, `stepKey`.

- [ ] **Step 1: Markdown component**

`src/app/components/Markdown.tsx`:
```tsx
import { MarkdownHooks } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeShiki from '@shikijs/rehype';

const rehypePlugins = [[rehypeShiki, { themes: { light: 'github-light', dark: 'github-dark' } }]] as const;
const remarkPlugins = [remarkGfm];

export function Markdown({ source, className = '' }: { source: string; className?: string }) {
  return (
    <div className={`prose-refresher ${className}`}>
      <MarkdownHooks
        remarkPlugins={remarkPlugins}
        // react-markdown's plugin tuple type is wide; the cast keeps the options object typed above.
        rehypePlugins={rehypePlugins as unknown as NonNullable<Parameters<typeof MarkdownHooks>[0]['rehypePlugins']>}
        fallback={<p className="text-ink-muted text-sm">Rendering…</p>}
      >
        {source}
      </MarkdownHooks>
    </div>
  );
}
```

Add to `src/index.css` (after the shiki rules):
```css
.prose-refresher { @apply text-[15px] leading-7; }
.prose-refresher h1 { @apply text-2xl font-semibold mt-2 mb-4 tracking-tight; }
.prose-refresher h2 { @apply text-xl font-semibold mt-8 mb-3; }
.prose-refresher h3 { @apply text-base font-semibold mt-6 mb-2; }
.prose-refresher p { @apply my-3; }
.prose-refresher ul { @apply list-disc pl-6 my-3; }
.prose-refresher ol { @apply list-decimal pl-6 my-3; }
.prose-refresher li { @apply my-1; }
.prose-refresher a { @apply text-accent underline; }
.prose-refresher blockquote { @apply border-l-2 border-accent pl-4 text-ink-muted my-4; }
.prose-refresher code:not(.shiki code) { @apply bg-surface-3 rounded px-1 py-0.5 text-[13px]; }
.prose-refresher pre { @apply my-4; }
.prose-refresher table { @apply w-full text-sm my-4 border-collapse; }
.prose-refresher th, .prose-refresher td { @apply border border-border px-2 py-1 text-left; }
.prose-refresher hr { @apply border-border my-6; }
```

- [ ] **Step 2: ConceptStep**

`src/app/steps/ConceptStep.tsx`:
```tsx
import type { ConceptStep as ConceptStepData } from '../../content/types';
import { Markdown } from '../components/Markdown';
import { Button } from '../components/Button';
import { stepKey } from '../../content/registry';
import { useStepDone, progressStore } from '../progress/useProgress';

export function ConceptStep({ step, lessonId }: { step: ConceptStepData; lessonId: string }) {
  const key = stepKey(lessonId, step.id);
  const done = useStepDone(key);
  return (
    <article className="mx-auto max-w-3xl px-6 py-8">
      <Markdown source={step.markdown} />
      <div className="mt-10 flex items-center gap-3 border-t border-border pt-6">
        {done ? (
          <span className="text-success text-sm">✓ Marked as read</span>
        ) : (
          <Button onClick={() => progressStore.completeStep(key)}>Mark as read</Button>
        )}
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Failing QuizStep test**

`src/app/steps/QuizStep.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuizStep } from './QuizStep';
import { progressStore } from '../progress/useProgress';
import { emptyProgress } from '../progress/types';
import type { QuizStep as QuizStepData } from '../../content/types';

const step: QuizStepData = {
  kind: 'quiz', id: 'q', title: 'Quiz',
  questions: [
    { id: 'q1', prompt: 'What is 1+1?', choices: [{ id: 'a', text: '1' }, { id: 'b', text: '2' }], correctChoiceId: 'b', explanation: 'Because arithmetic.' },
    { id: 'q2', prompt: 'Pick B', choices: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctChoiceId: 'b', explanation: 'B it is.' },
  ],
};

beforeEach(() => progressStore.replace(emptyProgress()));

describe('QuizStep', () => {
  it('shows one question at a time, gives feedback, and completes when all are answered', async () => {
    const user = userEvent.setup();
    render(<QuizStep step={step} lessonId="l" />);
    expect(screen.getByText('What is 1+1?')).toBeTruthy();
    expect(screen.queryByText('Pick B')).toBeNull();

    await user.click(screen.getByRole('button', { name: '1' }));
    expect(screen.getByText(/not quite/i)).toBeTruthy();
    expect(screen.getByText('Because arithmetic.')).toBeTruthy();
    expect(progressStore.getSnapshot().quiz['l/q']).toEqual({ q1: 'a' });

    await user.click(screen.getByRole('button', { name: /next question/i }));
    expect(screen.getByText('Pick B')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'B' }));
    expect(screen.getByText(/correct/i)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /finish/i }));
    expect(screen.getByText(/you got 1 of 2/i)).toBeTruthy();
    expect(progressStore.getSnapshot().steps['l/q']).toBeDefined();
  });

  it('restores previously answered questions and lets you retake', async () => {
    const user = userEvent.setup();
    progressStore.answerQuiz('l/q', 'q1', 'b');
    progressStore.answerQuiz('l/q', 'q2', 'b');
    progressStore.completeStep('l/q');
    render(<QuizStep step={step} lessonId="l" />);
    expect(screen.getByText(/you got 2 of 2/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /retake/i }));
    expect(screen.getByText('What is 1+1?')).toBeTruthy();
    expect(progressStore.getSnapshot().quiz['l/q']).toBeUndefined();
  });
});
```

Add `clearQuiz(key: string): void` to the store (Task 6 interface extension): removes `progress.quiz[key]` and uncompletes the step. Implement in `store.ts`:
```ts
clearQuiz(key) {
  const { [key]: _q, ...quiz } = progress.quiz;
  const { [key]: _s, ...steps } = progress.steps;
  update({ ...progress, quiz, steps });
},
```
and add `clearQuiz(key: string): void;` to the `ProgressStore` type.

- [ ] **Step 4: Run to verify it fails**

Run: `pnpm vitest run src/app/steps/QuizStep.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 5: Implement QuizStep**

`src/app/steps/QuizStep.tsx`:
```tsx
import { useState } from 'react';
import type { QuizStep as QuizStepData } from '../../content/types';
import { stepKey } from '../../content/registry';
import { progressStore, useProgress } from '../progress/useProgress';
import { Markdown } from '../components/Markdown';
import { Button } from '../components/Button';

export function QuizStep({ step, lessonId }: { step: QuizStepData; lessonId: string }) {
  const key = stepKey(lessonId, step.id);
  const progress = useProgress();
  const answers = progress.quiz[key] ?? {};
  const done = progress.steps[key] !== undefined;
  const firstUnanswered = step.questions.findIndex((q) => answers[q.id] === undefined);
  const [index, setIndex] = useState(() => (firstUnanswered === -1 ? step.questions.length : firstUnanswered));

  const correctCount = step.questions.filter((q) => answers[q.id] === q.correctChoiceId).length;

  if (done || index >= step.questions.length) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-8">
        <h2 className="text-2xl font-semibold">Quiz complete</h2>
        <p className="mt-2 text-lg">You got {correctCount} of {step.questions.length}.</p>
        <ul className="mt-6 space-y-4">
          {step.questions.map((q) => {
            const chosen = answers[q.id];
            const ok = chosen === q.correctChoiceId;
            return (
              <li key={q.id} className="rounded-lg border border-border bg-surface-2 p-4">
                <Markdown source={q.prompt} />
                <p className={`text-sm mt-1 ${ok ? 'text-success' : 'text-danger'}`}>
                  {ok ? 'Correct' : `You chose “${q.choices.find((c) => c.id === chosen)?.text ?? '—'}”; correct: “${q.choices.find((c) => c.id === q.correctChoiceId)?.text}”`}
                </p>
                <div className="text-sm text-ink-muted"><Markdown source={q.explanation} /></div>
              </li>
            );
          })}
        </ul>
        <div className="mt-6">
          <Button variant="ghost" onClick={() => { progressStore.clearQuiz(key); setIndex(0); }}>Retake quiz</Button>
        </div>
      </section>
    );
  }

  const question = step.questions[index]!;
  const chosen = answers[question.id];
  const answered = chosen !== undefined;
  const isLast = index === step.questions.length - 1;

  return (
    <section className="mx-auto max-w-3xl px-6 py-8">
      <p className="text-xs uppercase tracking-wide text-ink-muted">Question {index + 1} of {step.questions.length}</p>
      <div className="mt-2 text-lg"><Markdown source={question.prompt} /></div>
      <div className="mt-4 grid gap-2">
        {question.choices.map((c) => {
          const isChosen = chosen === c.id;
          const isCorrect = c.id === question.correctChoiceId;
          let cls = 'border-border hover:border-accent';
          if (answered && isCorrect) cls = 'border-success bg-success/10';
          else if (answered && isChosen) cls = 'border-danger bg-danger/10';
          return (
            <button
              key={c.id}
              type="button"
              disabled={answered}
              onClick={() => progressStore.answerQuiz(key, question.id, c.id)}
              className={`text-left rounded-md border px-4 py-3 transition-colors disabled:cursor-default ${cls}`}
            >
              {c.text}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="mt-4 rounded-md border border-border bg-surface-2 p-4">
          <p className={`font-medium ${chosen === question.correctChoiceId ? 'text-success' : 'text-danger'}`}>
            {chosen === question.correctChoiceId ? 'Correct!' : 'Not quite.'}
          </p>
          <div className="text-sm"><Markdown source={question.explanation} /></div>
          <div className="mt-3">
            {isLast ? (
              <Button onClick={() => { progressStore.completeStep(key); setIndex(index + 1); }}>Finish quiz</Button>
            ) : (
              <Button onClick={() => setIndex(index + 1)}>Next question</Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
```

Note on `Markdown` inside tests: `MarkdownHooks` renders its fallback first and the content asynchronously. The test asserts `screen.getByText('What is 1+1?')` synchronously, which would fail. Fix in the test file by mocking the Markdown component:
```tsx
import { vi } from 'vitest';
vi.mock('../components/Markdown', () => ({ Markdown: ({ source }: { source: string }) => <div>{source}</div> }));
```
Put this `vi.mock` above the other imports' usage (Vitest hoists it). Keep this mock pattern for the ExerciseStep test too.

- [ ] **Step 6: ExerciseStep placeholder**

`src/app/steps/ExerciseStep.tsx`:
```tsx
import type { ExerciseStep as ExerciseStepData } from '../../content/types';
export function ExerciseStep({ step }: { step: ExerciseStepData; lessonId: string }) {
  return <p className="p-6">Exercise “{step.title}” UI arrives in Task 10.</p>;
}
```

- [ ] **Step 7: LessonPage**

`src/app/LessonPage.tsx`:
```tsx
import { useEffect } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router';
import { getLesson, stepKey } from '../content/registry';
import { progressStore, useProgress } from './progress/useProgress';
import { ConceptStep } from './steps/ConceptStep';
import { QuizStep } from './steps/QuizStep';
import { ExerciseStep } from './steps/ExerciseStep';
import { Button } from './components/Button';

const kindLabel = { concept: 'Read', exercise: 'Code', quiz: 'Quiz' } as const;

export function LessonPage() {
  const { lessonId = '', stepIndex: stepIndexParam } = useParams();
  const navigate = useNavigate();
  const lesson = getLesson(lessonId);
  const progress = useProgress();
  const index = Math.max(0, Math.min(Number(stepIndexParam ?? 0) || 0, (lesson?.steps.length ?? 1) - 1));
  const step = lesson?.steps[index];

  useEffect(() => {
    if (lesson) progressStore.setLastVisited(`/lesson/${lesson.id}/${index}`);
  }, [lesson, index]);

  if (!lesson || !step) {
    return (
      <div className="p-8">
        <p>That lesson does not exist (yet).</p>
        <Link to="/" className="text-accent underline">Back to dashboard</Link>
      </div>
    );
  }

  const isLast = index === lesson.steps.length - 1;
  const isExercise = step.kind === 'exercise';

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      <aside className="w-64 shrink-0 border-r border-border bg-surface-2 overflow-y-auto">
        <div className="p-4 border-b border-border">
          <Link to="/" className="text-xs text-ink-muted hover:text-ink">← Dashboard</Link>
          <h1 className="mt-1 font-semibold leading-tight">{lesson.title}</h1>
        </div>
        <ol className="p-2">
          {lesson.steps.map((s, i) => {
            const done = progress.steps[stepKey(lesson.id, s.id)] !== undefined;
            return (
              <li key={s.id}>
                <NavLink
                  to={`/lesson/${lesson.id}/${i}`}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${isActive ? 'bg-surface-3 text-ink' : 'text-ink-muted hover:text-ink'}`
                  }
                >
                  <span className={`h-2 w-2 rounded-full ${done ? 'bg-success' : 'bg-border'}`} aria-hidden />
                  <span className="text-[10px] uppercase tracking-wide w-9 text-ink-muted">{kindLabel[s.kind]}</span>
                  <span className="truncate">{s.title}</span>
                </NavLink>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col">
        <div className={`flex-1 min-h-0 ${isExercise ? '' : 'overflow-y-auto'}`}>
          {step.kind === 'concept' && <ConceptStep key={step.id} step={step} lessonId={lesson.id} />}
          {step.kind === 'quiz' && <QuizStep key={step.id} step={step} lessonId={lesson.id} />}
          {step.kind === 'exercise' && <ExerciseStep key={step.id} step={step} lessonId={lesson.id} />}
        </div>
        <footer className="border-t border-border bg-surface-2 px-4 py-2 flex items-center justify-between">
          <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => void navigate(`/lesson/${lesson.id}/${index - 1}`)}>
            ← Previous
          </Button>
          <span className="text-xs text-ink-muted">Step {index + 1} of {lesson.steps.length}</span>
          {isLast ? (
            <Link to="/"><Button size="sm" variant="ghost">Back to dashboard</Button></Link>
          ) : (
            <Button size="sm" onClick={() => void navigate(`/lesson/${lesson.id}/${index + 1}`)}>Next →</Button>
          )}
        </footer>
      </section>
    </div>
  );
}
```

- [ ] **Step 8: Run tests and typecheck**

Run: `pnpm vitest run src/app` → PASS.
Run: `pnpm typecheck` → PASS. If the `rehypePlugins` cast is rejected, type it as `import type { PluggableList } from 'unified'` and add `unified` as a dependency (`pnpm add unified`); `const rehypePlugins: PluggableList = [[rehypeShiki, {...}]]`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(app): lesson stepper with markdown concept steps and graded quiz steps" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Exercise step: editor, sandbox bridge, checks, hints, solution

**Files:**
- Create: `src/app/exercise/CodeEditor.tsx`, `src/app/exercise/sandbox-reducer.ts`, `src/app/exercise/sandbox-reducer.test.ts`, `src/app/exercise/useSandbox.ts`, `src/app/exercise/ChecksPanel.tsx`, `src/app/exercise/ConsolePanel.tsx`, `src/app/exercise/HintsPanel.tsx`, `src/app/steps/ExerciseStep.test.tsx`
- Modify: `src/app/steps/ExerciseStep.tsx` (replace placeholder)

**Interfaces:**
- Produces:
  - `SandboxState = { ready: boolean; runId: number; phase: 'idle' | 'compiling' | 'checking' | 'ok' | 'compile-error' | 'runtime-error'; results: CheckResult[] | null; allPassed: boolean | null; error: { message: string; filename?: string; line?: number } | null; logs: LogLine[] }`, `LogLine = { id: number; level: ConsoleLevel; text: string }`.
  - `sandboxReducer(state, action)` with actions `{ type: 'message'; msg: FrameToParent } | { type: 'start'; runId: number; mode: RunMode } | { type: 'clear-logs' }`.
  - `useSandbox(): { state; iframeRef; runPreview(files, entry, key); runChecks(files, entry, key); clearLogs() }`.
  - `<CodeEditor value onChange onRun readOnly? />`.
- Consumes: protocol (Task 5), `PREVIEW_PATH`, progress store, `Markdown`, `Button`.

- [ ] **Step 1: Failing reducer test**

`src/app/exercise/sandbox-reducer.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { sandboxReducer, initialSandboxState } from './sandbox-reducer';

describe('sandboxReducer', () => {
  it('tracks readiness and run phases', () => {
    let s = sandboxReducer(initialSandboxState, { type: 'message', msg: { type: 'ready' } });
    expect(s.ready).toBe(true);
    s = sandboxReducer(s, { type: 'start', runId: 1, mode: 'preview' });
    expect(s.phase).toBe('compiling');
    s = sandboxReducer(s, { type: 'message', msg: { type: 'preview-ok', runId: 1 } });
    expect(s.phase).toBe('ok');
    expect(s.error).toBeNull();
  });

  it('ignores messages from stale runs', () => {
    let s = sandboxReducer(initialSandboxState, { type: 'start', runId: 2, mode: 'checks' });
    s = sandboxReducer(s, { type: 'message', msg: { type: 'check-results', runId: 1, results: [], allPassed: true } });
    expect(s.results).toBeNull();
    expect(s.phase).toBe('checking');
  });

  it('records compile errors, runtime errors, and results', () => {
    let s = sandboxReducer(initialSandboxState, { type: 'start', runId: 3, mode: 'checks' });
    s = sandboxReducer(s, { type: 'message', msg: { type: 'compile-error', runId: 3, message: 'bad', filename: 'App.tsx', line: 2 } });
    expect(s.phase).toBe('compile-error');
    expect(s.error).toEqual({ message: 'bad', filename: 'App.tsx', line: 2 });
    s = sandboxReducer(s, { type: 'start', runId: 4, mode: 'checks' });
    expect(s.error).toBeNull();
    s = sandboxReducer(s, { type: 'message', msg: { type: 'check-results', runId: 4, allPassed: false, results: [{ name: 'x', status: 'fail', error: 'e', durationMs: 1 }] } });
    expect(s.phase).toBe('ok');
    expect(s.allPassed).toBe(false);
    expect(s.results?.length).toBe(1);
    s = sandboxReducer(s, { type: 'message', msg: { type: 'runtime-error', runId: 4, message: 'kaboom' } });
    expect(s.phase).toBe('runtime-error');
  });

  it('collects console lines with ids and clears them on demand and on new runs', () => {
    let s = sandboxReducer(initialSandboxState, { type: 'message', msg: { type: 'console', level: 'log', args: ['a', 'b'] } });
    s = sandboxReducer(s, { type: 'message', msg: { type: 'console', level: 'warn', args: ['c'] } });
    expect(s.logs.map((l) => l.text)).toEqual(['a b', 'c']);
    expect(s.logs[0]?.id).not.toBe(s.logs[1]?.id);
    s = sandboxReducer(s, { type: 'start', runId: 9, mode: 'preview' });
    expect(s.logs).toEqual([]);
    s = sandboxReducer(s, { type: 'message', msg: { type: 'console', level: 'log', args: ['d'] } });
    s = sandboxReducer(s, { type: 'clear-logs' });
    expect(s.logs).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/app/exercise/sandbox-reducer.test.ts` → FAIL, module not found.

- [ ] **Step 3: Implement the reducer**

`src/app/exercise/sandbox-reducer.ts`:
```ts
import type { CheckResult, ConsoleLevel, FrameToParent, RunMode } from '../../sandbox/protocol';

export type LogLine = { id: number; level: ConsoleLevel; text: string };

export type SandboxState = {
  ready: boolean;
  runId: number;
  mode: RunMode;
  phase: 'idle' | 'compiling' | 'checking' | 'ok' | 'compile-error' | 'runtime-error';
  results: CheckResult[] | null;
  allPassed: boolean | null;
  error: { message: string; filename?: string; line?: number } | null;
  logs: LogLine[];
  nextLogId: number;
};

export type SandboxAction =
  | { type: 'message'; msg: FrameToParent }
  | { type: 'start'; runId: number; mode: RunMode }
  | { type: 'clear-logs' };

export const initialSandboxState: SandboxState = {
  ready: false, runId: 0, mode: 'preview', phase: 'idle', results: null, allPassed: null, error: null, logs: [], nextLogId: 1,
};

export function sandboxReducer(state: SandboxState, action: SandboxAction): SandboxState {
  switch (action.type) {
    case 'start':
      return { ...state, runId: action.runId, mode: action.mode, phase: action.mode === 'checks' ? 'checking' : 'compiling', error: null, logs: [], ...(action.mode === 'checks' ? { results: null, allPassed: null } : {}) };
    case 'clear-logs':
      return { ...state, logs: [] };
    case 'message': {
      const { msg } = action;
      switch (msg.type) {
        case 'ready':
          return { ...state, ready: true };
        case 'console':
          return { ...state, logs: [...state.logs, { id: state.nextLogId, level: msg.level, text: msg.args.join(' ') }], nextLogId: state.nextLogId + 1 };
        case 'preview-ok':
          return msg.runId !== state.runId ? state : { ...state, phase: 'ok', error: null };
        case 'compile-error':
          return msg.runId !== state.runId ? state : { ...state, phase: 'compile-error', error: { message: msg.message, filename: msg.filename, line: msg.line } };
        case 'runtime-error':
          return msg.runId !== state.runId ? state : { ...state, phase: 'runtime-error', error: { message: msg.message } };
        case 'check-results':
          return msg.runId !== state.runId ? state : { ...state, phase: 'ok', results: msg.results, allPassed: msg.allPassed };
      }
    }
  }
}
```

If TypeScript complains that `sandboxReducer` lacks a return in some path, add `return state;` after the inner switch.

- [ ] **Step 4: Run reducer tests** → `pnpm vitest run src/app/exercise/sandbox-reducer.test.ts` PASS (4 tests).

- [ ] **Step 5: useSandbox hook**

`src/app/exercise/useSandbox.ts`:
```ts
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { isFrameToParent, type ParentToFrame } from '../../sandbox/protocol';
import { initialSandboxState, sandboxReducer } from './sandbox-reducer';

let runCounter = 0;

export function useSandbox() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [state, dispatch] = useReducer(sandboxReducer, initialSandboxState);

  useEffect(() => {
    function onMessage(event: MessageEvent<unknown>) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (!isFrameToParent(event.data)) return;
      dispatch({ type: 'message', msg: event.data });
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const send = useCallback((mode: ParentToFrame['mode'], files: Record<string, string>, entry: string, exerciseKey: string) => {
    const target = iframeRef.current?.contentWindow;
    if (!target) return;
    const runId = ++runCounter;
    dispatch({ type: 'start', runId, mode });
    const msg: ParentToFrame = { type: 'run', runId, mode, files, entry, exerciseKey };
    target.postMessage(msg, window.location.origin);
  }, []);

  return {
    state,
    iframeRef,
    runPreview: useCallback((files: Record<string, string>, entry: string, key: string) => send('preview', files, entry, key), [send]),
    runChecks: useCallback((files: Record<string, string>, entry: string, key: string) => send('checks', files, entry, key), [send]),
    clearLogs: useCallback(() => dispatch({ type: 'clear-logs' }), []),
  };
}
```

- [ ] **Step 6: CodeEditor (CodeMirror 6)**

`src/app/exercise/CodeEditor.tsx`:
```tsx
import { useEffect, useEffectEvent, useRef } from 'react';
import { EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTheme } from '../theme';

type Props = {
  value: string;
  onChange?: (next: string) => void;
  onRun?: () => void;
  readOnly?: boolean;
};

export function CodeEditor({ value, onChange, onRun, readOnly = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const theme = useTheme();

  // Effect Events: always see the latest props without re-creating the editor.
  const handleChange = useEffectEvent((next: string) => onChange?.(next));
  const handleRun = useEffectEvent(() => onRun?.());

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { handleRun(); return true; } }])),
        keymap.of([indentWithTab]),
        basicSetup,
        javascript({ jsx: true, typescript: true }),
        ...(theme === 'dark' ? [oneDark] : []),
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((u) => { if (u.docChanged) handleChange(u.state.doc.toString()); }),
        EditorView.theme({ '&': { height: '100%', fontSize: '13px' }, '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }),
      ],
    });
    const v = new EditorView({ state, parent: host.current });
    view.current = v;
    return () => { v.destroy(); view.current = null; };
    // Re-create only when theme or readOnly changes; `value` is synced by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, readOnly]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const current = v.state.doc.toString();
    if (current !== value) {
      v.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  return <div ref={host} className="h-full min-h-0 overflow-hidden" />;
}
```

If `useEffectEvent` is not exported by the installed React (it is stable since 19.2), replace with a `useRef` holding the latest callbacks and read `.current` inside the effect.

- [ ] **Step 7: Panels**

`src/app/exercise/ChecksPanel.tsx`:
```tsx
import type { SandboxState } from './sandbox-reducer';

export function ChecksPanel({ state, total }: { state: SandboxState; total: number }) {
  if (state.phase === 'compile-error' && state.error) {
    return (
      <div className="p-3 text-sm">
        <p className="text-danger font-medium">Compile error{state.error.filename ? ` in ${state.error.filename}` : ''}{state.error.line ? ` (line ${state.error.line})` : ''}</p>
        <pre className="mt-1 whitespace-pre-wrap text-xs text-danger/90">{state.error.message}</pre>
      </div>
    );
  }
  if (state.phase === 'runtime-error' && state.error) {
    return (
      <div className="p-3 text-sm">
        <p className="text-danger font-medium">Runtime error</p>
        <pre className="mt-1 whitespace-pre-wrap text-xs text-danger/90">{state.error.message}</pre>
      </div>
    );
  }
  if (state.phase === 'checking') return <p className="p-3 text-sm text-ink-muted">Running {total} checks…</p>;
  if (!state.results) return <p className="p-3 text-sm text-ink-muted">Press <kbd className="rounded border border-border px-1">Ctrl</kbd>+<kbd className="rounded border border-border px-1">Enter</kbd> or “Run checks” to grade your code.</p>;
  const passed = state.results.filter((r) => r.status === 'pass').length;
  return (
    <div className="p-3 text-sm">
      <p className={`font-medium ${state.allPassed ? 'text-success' : 'text-warning'}`}>
        {state.allPassed ? 'All checks passed!' : `${passed} of ${state.results.length} checks passed`}
      </p>
      <ul className="mt-2 space-y-1.5">
        {state.results.map((r) => (
          <li key={r.name} className="flex gap-2">
            <span className={r.status === 'pass' ? 'text-success' : 'text-danger'} aria-hidden>{r.status === 'pass' ? '✓' : '✗'}</span>
            <div className="min-w-0">
              <p>{r.name}</p>
              {r.error && <pre className="mt-0.5 whitespace-pre-wrap text-xs text-danger/90">{r.error}</pre>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`src/app/exercise/ConsolePanel.tsx`:
```tsx
import type { LogLine } from './sandbox-reducer';
import { Button } from '../components/Button';

const colors = { log: 'text-ink', info: 'text-accent', warn: 'text-warning', error: 'text-danger' } as const;

export function ConsolePanel({ logs, onClear }: { logs: LogLine[]; onClear: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-1">
        <span className="text-xs uppercase tracking-wide text-ink-muted">Console</span>
        <Button size="sm" variant="ghost" onClick={onClear} disabled={logs.length === 0}>Clear</Button>
      </div>
      <div className="flex-1 overflow-auto p-2 font-mono text-xs">
        {logs.length === 0 && <p className="text-ink-muted">console output from your code shows up here</p>}
        {logs.map((l) => <pre key={l.id} className={`whitespace-pre-wrap ${colors[l.level]}`}>{l.text}</pre>)}
      </div>
    </div>
  );
}
```

`src/app/exercise/HintsPanel.tsx`:
```tsx
import { useState } from 'react';
import { Markdown } from '../components/Markdown';
import { Button } from '../components/Button';

export function HintsPanel({ hints }: { hints: string[] }) {
  const [revealed, setRevealed] = useState(0);
  if (hints.length === 0) return null;
  return (
    <div className="mt-6 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">Hints</h3>
      <ol className="mt-2 space-y-2">
        {hints.slice(0, revealed).map((h, i) => (
          <li key={i} className="rounded-md border border-border bg-surface-2 p-3 text-sm"><Markdown source={h} /></li>
        ))}
      </ol>
      {revealed < hints.length && (
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => setRevealed((n) => n + 1)}>
          {revealed === 0 ? 'Show a hint' : `Show hint ${revealed + 1} of ${hints.length}`}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Failing ExerciseStep test**

`src/app/steps/ExerciseStep.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExerciseStep as ExerciseStepData } from '../../content/types';
import { progressStore } from '../progress/useProgress';
import { emptyProgress } from '../progress/types';
import { initialSandboxState, type SandboxState } from '../exercise/sandbox-reducer';

vi.mock('../components/Markdown', () => ({ Markdown: ({ source }: { source: string }) => <div>{source}</div> }));
vi.mock('../exercise/CodeEditor', () => ({
  CodeEditor: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <textarea aria-label="editor" value={value} onChange={(e) => onChange?.(e.target.value)} />
  ),
}));

const sandbox = {
  state: { ...initialSandboxState, ready: true } as SandboxState,
  iframeRef: { current: null },
  runPreview: vi.fn(),
  runChecks: vi.fn(),
  clearLogs: vi.fn(),
};
vi.mock('../exercise/useSandbox', () => ({ useSandbox: () => sandbox }));

import { ExerciseStep } from './ExerciseStep';

const step: ExerciseStepData = {
  kind: 'exercise', id: 'ex', title: 'Ex', prompt: 'Do the thing',
  files: { 'App.tsx': 'starter code', 'util.ts': 'export const x = 1;' },
  solution: { 'App.tsx': 'solution code', 'util.ts': 'export const x = 1;' },
  hints: ['first hint', 'second hint'],
  checks: [{ name: 'c1', run: () => {} }, { name: 'c2', run: () => {} }],
};

beforeEach(() => {
  progressStore.replace(emptyProgress());
  sandbox.state = { ...initialSandboxState, ready: true };
  vi.clearAllMocks();
});

describe('ExerciseStep', () => {
  it('shows starter code, saves edits to progress, and runs checks', async () => {
    const user = userEvent.setup();
    render(<ExerciseStep step={step} lessonId="l" />);
    const editor = screen.getByLabelText('editor') as HTMLTextAreaElement;
    expect(editor.value).toBe('starter code');
    await user.clear(editor);
    await user.type(editor, 'edited');
    expect(progressStore.getSnapshot().code['l/ex']?.['App.tsx']).toBe('edited');
    await user.click(screen.getByRole('button', { name: /run checks/i }));
    expect(sandbox.runChecks).toHaveBeenCalledWith(expect.objectContaining({ 'App.tsx': 'edited' }), 'App.tsx', 'l/ex');
  });

  it('restores saved code over the starter', () => {
    progressStore.saveCode('l/ex', { 'App.tsx': 'saved!', 'util.ts': 'export const x = 1;' });
    render(<ExerciseStep step={step} lessonId="l" />);
    expect((screen.getByLabelText('editor') as HTMLTextAreaElement).value).toBe('saved!');
  });

  it('switches files with tabs and resets to starter', async () => {
    const user = userEvent.setup();
    progressStore.saveCode('l/ex', { 'App.tsx': 'changed', 'util.ts': 'changed too' });
    render(<ExerciseStep step={step} lessonId="l" />);
    await user.click(screen.getByRole('tab', { name: 'util.ts' }));
    expect((screen.getByLabelText('editor') as HTMLTextAreaElement).value).toBe('changed too');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /reset/i }));
    expect((screen.getByLabelText('editor') as HTMLTextAreaElement).value).toBe('export const x = 1;');
    expect(progressStore.getSnapshot().code['l/ex']).toBeUndefined();
  });

  it('reveals hints progressively and shows the solution read-only on request', async () => {
    const user = userEvent.setup();
    render(<ExerciseStep step={step} lessonId="l" />);
    expect(screen.queryByText('first hint')).toBeNull();
    await user.click(screen.getByRole('button', { name: /show a hint/i }));
    expect(screen.getByText('first hint')).toBeTruthy();
    expect(screen.queryByText('second hint')).toBeNull();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /show solution/i }));
    expect(screen.getByText('solution code')).toBeTruthy();
  });

  it('marks the step complete when all checks pass', () => {
    sandbox.state = { ...initialSandboxState, ready: true, phase: 'ok', results: [{ name: 'c1', status: 'pass', durationMs: 1 }], allPassed: true };
    render(<ExerciseStep step={step} lessonId="l" />);
    expect(progressStore.getSnapshot().steps['l/ex']).toBeDefined();
    expect(screen.getByText(/all checks passed/i)).toBeTruthy();
  });
});
```

Add `clearCode(key: string): void` to the store (removes `progress.code[key]`); add to the `ProgressStore` type and implement:
```ts
clearCode(key) {
  if (!progress.code[key]) return;
  const { [key]: _c, ...code } = progress.code;
  update({ ...progress, code });
},
```

- [ ] **Step 9: Run to verify it fails** → `pnpm vitest run src/app/steps/ExerciseStep.test.tsx` FAIL (placeholder has no editor).

- [ ] **Step 10: Implement ExerciseStep**

`src/app/steps/ExerciseStep.tsx`:
```tsx
import { useEffect, useState } from 'react';
import type { ExerciseStep as ExerciseStepData } from '../../content/types';
import { stepKey } from '../../content/registry';
import { PREVIEW_PATH } from '../../sandbox/protocol';
import { progressStore, useProgress } from '../progress/useProgress';
import { Markdown } from '../components/Markdown';
import { Button } from '../components/Button';
import { CodeEditor } from '../exercise/CodeEditor';
import { useSandbox } from '../exercise/useSandbox';
import { ChecksPanel } from '../exercise/ChecksPanel';
import { ConsolePanel } from '../exercise/ConsolePanel';
import { HintsPanel } from '../exercise/HintsPanel';

const PREVIEW_DEBOUNCE_MS = 400;

export function ExerciseStep({ step, lessonId }: { step: ExerciseStepData; lessonId: string }) {
  const key = stepKey(lessonId, step.id);
  const entry = step.entry ?? 'App.tsx';
  const progress = useProgress();
  const files = progress.code[key] ?? step.files;
  const done = progress.steps[key] !== undefined;
  const fileNames = Object.keys(step.files);
  const [activeFile, setActiveFile] = useState(entry in step.files ? entry : fileNames[0] ?? entry);
  const [showSolution, setShowSolution] = useState(false);
  const { state, iframeRef, runPreview, runChecks, clearLogs } = useSandbox();

  // Live preview: debounce after edits; also run once when the iframe becomes ready.
  useEffect(() => {
    if (!state.ready) return;
    const t = setTimeout(() => runPreview(files, entry, key), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [files, entry, key, state.ready, runPreview]);

  // Completion is derived from the sandbox result.
  useEffect(() => {
    if (state.allPassed && state.results) progressStore.completeStep(key);
  }, [state.allPassed, state.results, key]);

  function handleChange(next: string) {
    progressStore.saveCode(key, { ...files, [activeFile]: next });
  }

  function handleRunChecks() {
    runChecks(files, entry, key);
  }

  function handleReset() {
    if (!window.confirm('Reset this exercise to the starter code? Your edits will be lost.')) return;
    progressStore.clearCode(key);
    setShowSolution(false);
  }

  function handleShowSolution() {
    if (showSolution) { setShowSolution(false); return; }
    if (!window.confirm('Show the solution? Try the hints first if you have not.')) return;
    setShowSolution(true);
  }

  const editorValue = (showSolution ? step.solution : files)[activeFile] ?? '';

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(280px,1fr)_minmax(0,1.6fr)_minmax(280px,1fr)]">
      {/* Prompt + hints */}
      <aside className="min-h-0 overflow-y-auto border-r border-border p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold">{step.title}</h2>
          {done && <span className="shrink-0 text-xs text-success">✓ Complete</span>}
        </div>
        <Markdown source={step.prompt} className="mt-3" />
        <HintsPanel hints={step.hints} />
        <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button size="sm" variant="ghost" onClick={handleReset}>Reset to starter</Button>
          <Button size="sm" variant={showSolution ? 'primary' : 'ghost'} onClick={handleShowSolution}>
            {showSolution ? 'Hide solution' : 'Show solution'}
          </Button>
        </div>
      </aside>

      {/* Editor */}
      <section className="flex min-h-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border bg-surface-2 pr-2">
          <div role="tablist" className="flex">
            {fileNames.map((name) => (
              <button
                key={name}
                role="tab"
                type="button"
                aria-selected={name === activeFile}
                onClick={() => setActiveFile(name)}
                className={`px-3 py-1.5 text-xs font-mono border-r border-border ${name === activeFile ? 'bg-surface text-ink' : 'text-ink-muted hover:text-ink'}`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {showSolution && <span className="text-xs text-warning">Viewing solution (read-only)</span>}
            <Button size="sm" onClick={handleRunChecks} disabled={!state.ready || state.phase === 'checking'}>
              {state.phase === 'checking' ? 'Running…' : 'Run checks'}
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <CodeEditor key={`${activeFile}:${showSolution}`} value={editorValue} onChange={showSolution ? undefined : handleChange} onRun={handleRunChecks} readOnly={showSolution} />
        </div>
      </section>

      {/* Preview + results + console */}
      <section className="grid min-h-0 grid-rows-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.7fr)]">
        <div className="min-h-0 border-b border-border">
          <iframe
            ref={iframeRef}
            src={PREVIEW_PATH}
            title="Preview"
            sandbox="allow-scripts allow-same-origin"
            className="h-full w-full bg-[#111318]"
          />
        </div>
        <div className="min-h-0 overflow-y-auto border-b border-border">
          <ChecksPanel state={state} total={step.checks.length} />
        </div>
        <div className="min-h-0">
          <ConsolePanel logs={state.logs} onClear={clearLogs} />
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 11: Run tests**

Run: `pnpm vitest run src/app` → PASS. Common fixes:
- In the "reset" test the `util.ts` tab is `role="tab"`; the query uses `{ name: 'util.ts' }`.
- `runChecks` is called with `files` (which after edits is the progress-saved object); the `expect.objectContaining` handles key order.
- `window.confirm` must be mocked before clicking reset/solution (done in the tests).

Run: `pnpm typecheck` → PASS.

- [ ] **Step 12: Manual browser check**

Run `pnpm dev`. There are no lessons yet, so temporarily visit `http://localhost:5173/preview.html` to confirm it still boots. Full end-to-end verification happens in Task 11 with the first lesson.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat(app): exercise step with CodeMirror editor, sandbox bridge, checks, console, hints, solution" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---
### Task 11: Lesson 01 "Rendering and state" + solution validation suite

**Files:**
- Create: `src/content/lessons/01-rendering-and-state/lesson.ts`, `01-how-react-renders.md`, `02-fix-the-counter/starter.tsx`, `02-fix-the-counter/solution.tsx`, `02-fix-the-counter/checks.ts`, `02-fix-the-counter/hints.md`, `02-fix-the-counter/prompt.md`, `03-derived-state-and-keys.md`, `04-quiz.ts`, `src/content/__tests__/solutions.test.ts`, `src/content/lesson-helpers.ts`

**Interfaces:**
- Produces: `splitHints(raw: string): string[]` in `lesson-helpers.ts`; the lesson module default-exporting a `Lesson`.
- Consumes: types (Task 2), `runChecks` + `baseRegistry` (Tasks 4-5).

- [ ] **Step 1: Lesson helpers**

`src/content/lesson-helpers.ts`:
```ts
/** hints.md uses a line containing only `---` between hints. */
export function splitHints(raw: string): string[] {
  return raw
    .split(/\r?\n---\r?\n/)
    .map((h) => h.trim())
    .filter((h) => h.length > 0);
}
```

- [ ] **Step 2: Write the solution validation suite (fails until a lesson exists)**

`src/content/__tests__/solutions.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { getLessons } from '../registry';
import { runChecks } from '../../sandbox/runner';
import { baseRegistry } from '../../sandbox/registry';
import type { ExerciseStep, Lesson } from '../types';

const exercises: Array<{ lesson: Lesson; step: ExerciseStep }> = getLessons().flatMap((lesson) =>
  lesson.steps.filter((s): s is ExerciseStep => s.kind === 'exercise').map((step) => ({ lesson, step })),
);

describe('every exercise', () => {
  it('exists (at least one lesson with an exercise is registered)', () => {
    expect(exercises.length).toBeGreaterThan(0);
  });

  for (const { lesson, step } of exercises) {
    describe(`${lesson.id}/${step.id}`, () => {
      it('solution passes every check', async () => {
        const out = await runChecks({ files: step.solution, entry: step.entry, checks: step.checks, registry: baseRegistry });
        if (out.kind === 'compile-error') throw new Error(out.error.message);
        const failed = out.results.filter((r) => r.status === 'fail');
        expect(failed, failed.map((f) => `${f.name}: ${f.error}`).join('\n')).toEqual([]);
      });

      it('starter fails at least one check (exercise is not trivially complete)', async () => {
        const out = await runChecks({ files: step.files, entry: step.entry, checks: step.checks, registry: baseRegistry });
        if (out.kind === 'compile-error') return; // a non-compiling starter is a valid "fix the code" exercise
        expect(out.allPassed).toBe(false);
      });

      it('starter and solution have the same file names, and hints/prompt are non-empty', () => {
        expect(Object.keys(step.files).sort()).toEqual(Object.keys(step.solution).sort());
        expect(step.prompt.trim().length).toBeGreaterThan(0);
        expect(step.checks.length).toBeGreaterThan(0);
      });
    });
  }
});
```

Run: `pnpm vitest run src/content` → the first test FAILS (no exercises yet).

- [ ] **Step 3: Concept 1 markdown**

`src/content/lessons/01-rendering-and-state/01-how-react-renders.md`:
````markdown
# How React renders

Everything you write in React gets pulled through the same three-phase loop. Once this loop is in your head, most "why did that happen?" questions answer themselves.

## Trigger → render → commit

1. **Trigger.** Something asks for a render: the initial `createRoot(...).render()`, or a state setter call (`setCount(1)`), or a parent re-rendering.
2. **Render.** React calls your component function. The function returns JSX, which is a plain description of UI: `<button>` becomes `{ type: 'button', props: {...} }`. Nothing touches the DOM yet. Rendering must be **pure**: same props and state in, same JSX out, no side effects.
3. **Commit.** React diffs the new description against the previous one and applies only the minimal DOM changes. Then it runs your effects.

```tsx
function Counter() {
  const [count, setCount] = useState(0);        // read the snapshot for this render
  console.log('render with count =', count);     // runs during the render phase
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

The `console.log` runs every render. The DOM update happens once per commit. Those are different moments.

## State is a snapshot

`count` is not a live variable that React mutates. It is a **value captured when this render started**. Every closure created during that render (event handlers, timers, promises) sees that same value, forever.

```tsx
function handleClick() {
  setCount(count + 1);   // count is 0 in this render
  setCount(count + 1);   // still 0: this is the same snapshot
  setCount(count + 1);   // still 0
}
// After the click, count is 1, not 3.
```

React does not re-run your function mid-handler. It queues the updates and re-renders once after the handler returns. That is **batching**, and since React 18 it applies everywhere: inside promises, timeouts, and native event listeners too, not only inside React event handlers.

## Updater functions read the queue, not the snapshot

When the next value depends on the previous one, pass a function. React calls it with the latest queued value:

```tsx
setCount((c) => c + 1);
setCount((c) => c + 1);
setCount((c) => c + 1);
// 0 → 1 → 2 → 3 in one render
```

This also fixes the classic stale-closure bug:

```tsx
// ❌ captured `count` may be old by the time the timer fires
setTimeout(() => setCount(count + 1), 1000);

// ✅ reads whatever the value is at that moment
setTimeout(() => setCount((c) => c + 1), 1000);
```

Rule of thumb: **if the new state is computed from the old state, use an updater.** If it is a fresh value from the outside world (an input's text, a server response), pass the value.

## Why purity matters more than ever

React 18 introduced concurrent rendering: React may start rendering, pause, throw the work away, and restart. React 19's Compiler goes further and memoizes your components automatically. Both rely on the render phase being pure. Mutating an object you received as a prop, writing to a variable outside the component, or calling `Math.random()` during render all break that contract in ways that used to be merely ugly and are now actively wrong.

In the exercise you will fix a counter with two stale-snapshot bugs. Keep "snapshot vs queue" in mind.
````

- [ ] **Step 4: Exercise files**

`02-fix-the-counter/prompt.md`:
```markdown
This counter has two bugs, both caused by reading a **stale snapshot** of `count`.

1. The **+3** button only adds 1.
2. The **+1 in a moment** button schedules an increment 300ms later, but it overwrites any clicks that happened while waiting. Click "+1 in a moment" and then "+3" quickly: you should end up 4 higher than you started, not 1.

Fix both without changing the JSX. Then hit **Run checks**.
```

`02-fix-the-counter/starter.tsx`:
```tsx
import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  function handleTriple() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  function handleDelayed() {
    setTimeout(() => {
      setCount(count + 1);
    }, 300);
  }

  return (
    <div>
      <p>
        Count: <output data-testid="count">{count}</output>
      </p>
      <button onClick={handleTriple}>+3</button>
      <button onClick={handleDelayed}>+1 in a moment</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
```

`02-fix-the-counter/solution.tsx`:
```tsx
import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  function handleTriple() {
    // Updater functions read the latest queued value, not this render's snapshot.
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);
  }

  function handleDelayed() {
    setTimeout(() => {
      // By the time this runs, `count` from the render that created the timer may be stale.
      setCount((c) => c + 1);
    }, 300);
  }

  return (
    <div>
      <p>
        Count: <output data-testid="count">{count}</output>
      </p>
      <button onClick={handleTriple}>+3</button>
      <button onClick={handleDelayed}>+1 in a moment</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
```

`02-fix-the-counter/hints.md`:
```markdown
Each render gets its own `count`. Inside one click handler, `count` never changes, no matter how many times you call `setCount`.
---
`setCount` accepts a function: `setCount(c => c + 1)`. React calls it with the most recent value in the queue.
---
The delayed button has the same problem in disguise: the timer closure captured `count` from the render it was created in. Use an updater there too.
```

`02-fix-the-counter/checks.ts`:
```ts
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'renders with a count of 0',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.getByTestId('count').textContent).to.equal('0');
    },
  },
  {
    name: '"+3" increments by 3 in a single click',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: '+3' }));
      expect(screen.getByTestId('count').textContent).to.equal('3');
      await user.click(screen.getByRole('button', { name: '+3' }));
      expect(screen.getByTestId('count').textContent).to.equal('6');
    },
  },
  {
    name: '"+1 in a moment" does not clobber clicks made while it waits',
    run: async ({ render, screen, user, expect, Component, sleep }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: '+1 in a moment' }));
      await user.click(screen.getByRole('button', { name: '+3' }));
      expect(screen.getByTestId('count').textContent).to.equal('3');
      await sleep(400);
      expect(screen.getByTestId('count').textContent, 'after the delayed increment fires').to.equal('4');
    },
  },
  {
    name: 'Reset returns to 0',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: '+3' }));
      await user.click(screen.getByRole('button', { name: 'Reset' }));
      expect(screen.getByTestId('count').textContent).to.equal('0');
    },
  },
];
```

Because `checks.ts` contains JSX (`<Component />`), rename it to `checks.tsx`. Use `.tsx` for every exercise's checks file from now on, and reference it that way in `lesson.ts`.

Note for the third check: the delayed update happens outside `act`. React 19 logs a warning about updates not wrapped in act when `IS_REACT_ACT_ENVIRONMENT` is true. `runChecks` silences `console.error` during a check, so this is only noise. If the assertion after `sleep(400)` is flaky because the DOM has not flushed, wrap the read in `await act(async () => {})` first using `ctx.act`.

- [ ] **Step 5: Concept 2 markdown**

`03-derived-state-and-keys.md`:
````markdown
# Derived state and keys

Two habits separate React code that stays simple from React code that fights itself: **derive instead of duplicate**, and **give identity with keys**.

## Derive, don't duplicate

If a value can be computed from props or existing state, compute it during render. Do not store it in a second `useState` and try to keep the two in sync.

```tsx
// ❌ two sources of truth that will drift
const [items, setItems] = useState(initial);
const [total, setTotal] = useState(0);
useEffect(() => { setTotal(items.reduce((s, i) => s + i.price, 0)); }, [items]);

// ✅ one source of truth; the rest is arithmetic
const [items, setItems] = useState(initial);
const total = items.reduce((s, i) => s + i.price, 0);
```

The "effect that copies state into other state" pattern causes an extra render, a frame where the UI is inconsistent, and a class of bugs where the copy is stale. The React docs call this out under [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect), and the React Compiler makes the "but it's expensive to recompute" objection mostly moot: it memoizes derived values for you when the inputs have not changed.

The same applies to props: do not mirror a prop into state unless you intentionally want an *initial value that then diverges* (a "draft" you edit). Name it that way: `const [draftTitle, setDraftTitle] = useState(title)`.

## Keys are identity, not indexes

When you render a list, React needs to know which element in the new render corresponds to which element in the previous one. That is what `key` is for.

```tsx
{todos.map((todo) => <TodoRow key={todo.id} todo={todo} />)}
```

Using the array index as a key tells React "the item at position 2 is the same thing it was last time", which is false the moment you insert, remove, or reorder. Symptoms: input text that jumps to the wrong row, animations on the wrong element, and state (`useState` inside `TodoRow`) attached to the wrong item.

Keys also work as a **reset button**. Changing a component's `key` unmounts the old instance and mounts a fresh one with fresh state:

```tsx
<ProfileForm key={userId} userId={userId} />
```

That single line replaces a `useEffect` that resets form fields whenever `userId` changes.

## What "same component, same position" means

React preserves state as long as the same component type renders at the same position in the tree. Swap `<Counter />` for `<div><Counter /></div>` and the counter resets, because its position changed. Conditionally rendering `{isFancy ? <Counter fancy /> : <Counter />}` keeps the state, because it is the same type at the same position with different props.

Take the quiz next; it covers the snapshot model, batching, and keys.
````

- [ ] **Step 6: Quiz**

`04-quiz.ts`:
```ts
import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt: 'A handler runs `setN(n + 1)` twice in a row where `n` is `5`. After the re-render, what is `n`?',
      choices: [{ id: 'a', text: '7' }, { id: 'b', text: '6' }, { id: 'c', text: '5, the render is skipped' }],
      correctChoiceId: 'b',
      explanation: 'Both calls read the same snapshot (`5`) and queue "set to 6". Use `setN(c => c + 1)` to get 7.',
    },
    {
      id: 'q2',
      prompt: 'Which statement about batching in React 18+ is true?',
      choices: [
        { id: 'a', text: 'Only updates inside React event handlers are batched.' },
        { id: 'b', text: 'Updates in timeouts, promises, and native listeners are batched too.' },
        { id: 'c', text: 'Batching only happens in production builds.' },
      ],
      correctChoiceId: 'b',
      explanation: 'React 18 introduced automatic batching for all updates, not just those inside synthetic event handlers.',
    },
    {
      id: 'q3',
      prompt: 'You want a form to clear its fields whenever `userId` changes. What is the most idiomatic fix?',
      choices: [
        { id: 'a', text: 'A `useEffect` on `userId` that calls each setter with an empty string.' },
        { id: 'b', text: 'Render the form with `key={userId}`.' },
        { id: 'c', text: 'Store `userId` in state and compare it on every render.' },
      ],
      correctChoiceId: 'b',
      explanation: 'Changing the key remounts the component with fresh state. No effect, no extra render, no drift.',
    },
    {
      id: 'q4',
      prompt: 'Why is using the array index as a `key` a problem?',
      choices: [
        { id: 'a', text: 'It is slower because indexes are numbers.' },
        { id: 'b', text: 'React throws an error for numeric keys.' },
        { id: 'c', text: 'After inserts, removals, or reorders, state and DOM get attached to the wrong item.' },
      ],
      correctChoiceId: 'c',
      explanation: 'Keys are identity. An index says "whatever is at position i is the same item as before", which is false after the list changes shape.',
    },
    {
      id: 'q5',
      prompt: 'Which of these is allowed during the render phase?',
      choices: [
        { id: 'a', text: 'Computing `total` from `items` with `reduce`.' },
        { id: 'b', text: 'Pushing onto an array received as a prop.' },
        { id: 'c', text: 'Calling `fetch` and setting state when it resolves.' },
      ],
      correctChoiceId: 'a',
      explanation: 'Rendering must be pure: derive values freely, but never mutate inputs or start side effects. Concurrent rendering and the Compiler both rely on that.',
    },
  ],
};
```

- [ ] **Step 7: lesson.ts**

`src/content/lessons/01-rendering-and-state/lesson.ts`:
```ts
import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-how-react-renders.md?raw';
import prompt from './02-fix-the-counter/prompt.md?raw';
import starter from './02-fix-the-counter/starter.tsx?raw';
import solution from './02-fix-the-counter/solution.tsx?raw';
import hints from './02-fix-the-counter/hints.md?raw';
import { checks } from './02-fix-the-counter/checks';
import concept2 from './03-derived-state-and-keys.md?raw';
import { quiz } from './04-quiz';

const lesson: Lesson = {
  id: '01-rendering-and-state',
  title: 'Rendering and state',
  track: 'refresher',
  summary: 'Trigger, render, commit. State as a snapshot. Batching and updater functions.',
  steps: [
    { kind: 'concept', id: 'how-react-renders', title: 'How React renders', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'fix-the-counter',
      title: 'Fix the stale counter',
      prompt,
      files: { 'App.tsx': starter },
      solution: { 'App.tsx': solution },
      hints: splitHints(hints),
      checks,
    },
    { kind: 'concept', id: 'derived-state-and-keys', title: 'Derived state and keys', markdown: concept2 },
    quiz,
  ],
};

export default lesson;
```

- [ ] **Step 8: Run the whole suite and typecheck**

Run: `pnpm typecheck` → PASS (starter/solution are type-checked as real modules; `?raw` imports resolve via `vite/client`).
Run: `pnpm test` → PASS, including `solutions.test.ts` for `01-rendering-and-state/fix-the-counter` (solution passes 4, starter fails).

- [ ] **Step 9: Browser walk-through**

Run `pnpm dev`, open the dashboard. Expected: "Rendering and state" is a playable card. Click it:
- Step 1 renders the markdown with highlighted code; "Mark as read" flips the sidebar dot to green and `progress/progress.json` gains a `steps` entry.
- Step 2: editor shows the starter; preview shows the counter; clicking +3 in the preview adds 1 (bug). Press Ctrl+Enter: checks 2 and 3 fail with clear messages. Paste the solution (or use "Show solution" and copy) and re-run: all pass; the step is marked complete; the sidebar dot turns green. Reload: your code is restored from the JSON file.
- Step 4: quiz flow works end to end.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(content): lesson 01 rendering and state, plus solution validation suite" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Lesson 02 "Suspense and transitions"

**Files:**
- Create under `src/content/lessons/02-suspense-and-transitions/`: `lesson.ts`, `01-suspense-boundaries.md`, `02-add-a-loading-boundary/{prompt.md,starter.tsx,solution.tsx,hints.md,checks.tsx}`, `03-transitions.md`, `04-keep-the-tabs-responsive/{prompt.md,starter.tsx,solution.tsx,hints.md,checks.tsx}`

**Interfaces:**
- Consumes: `@server/users` (`fetchUser`), `@server/posts` (`fetchPosts`), lesson types, `splitHints`.

- [ ] **Step 1: Concept 1**

`01-suspense-boundaries.md`:
````markdown
# Suspense is a boundary, not a spinner

In React 18-era code you probably wrote loading UI like this:

```tsx
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
useEffect(() => { fetchUser(1).then((u) => { setUser(u); setLoading(false); }); }, []);
if (loading) return <Spinner />;
```

Every component that loads something re-implements this dance, and the loading states do not compose: three siblings each show their own spinner at slightly different times.

## The Suspense model

Suspense flips the ownership. A component that needs data it does not have yet **suspends** (throws a promise, in implementation terms). The nearest `<Suspense>` ancestor catches that and shows its `fallback` until the data arrives, then renders the real content. The component itself contains no loading logic.

```tsx
<Suspense fallback={<p>Loading profile…</p>}>
  <UserProfile />
</Suspense>
```

Where you put the boundary decides the granularity of the loading state. One boundary around the page: one spinner. A boundary per card: independent skeletons. Nested boundaries: the outer one shows first, inner ones reveal as they resolve.

## Reading a promise with `use()`

React 19 added `use`, a hook-like API that reads a promise (or a context) during render and suspends until it resolves:

```tsx
import { use } from 'react';

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise);   // suspends until resolved; throws if rejected
  return <h2>{user.name}</h2>;
}
```

Two rules make `use` work:

1. **The promise must be stable across renders.** If you create a new promise inside render (`use(fetchUser(1))`), every attempt to render produces a new pending promise and the component suspends forever. Create it once (in a parent, in a cache, in a loader) and pass it down. Frameworks and libraries like TanStack Query own this caching for you; in this sandbox the `@server/*` helpers cache for you where needed.
2. **A rejected promise throws during render**, so pair Suspense with an error boundary for real apps.

Unlike other hooks, `use` may be called inside conditions and loops.

## What the fallback replaces

When something suspends, React hides the **entire subtree under the nearest boundary** and shows the fallback. If you wrap your whole page in one boundary, a tiny widget loading late blanks the page. Put boundaries around the parts that load independently.

In the exercise, a profile component already reads a promise with `use`. Your job is to decide where the boundary goes and what it shows.
````

- [ ] **Step 2: Exercise A files**

`02-add-a-loading-boundary/prompt.md`:
```markdown
`UserProfile` reads a user with `use(userPromise)`. Right now nothing catches the suspension, so the page shows **nothing at all** for the first ~600ms.

Make it show the text **Loading profile…** while the profile loads, and keep the `<h1>Profile</h1>` heading visible the whole time (the heading should never disappear).

Do not change `UserProfile` or how the promise is created.
```

`02-add-a-loading-boundary/starter.tsx`:
```tsx
import { use } from 'react';
import { fetchUser } from '@server/users';

// Created once, outside render, so every render reads the same promise.
const userPromise = fetchUser(1);

function UserProfile() {
  const user = use(userPromise);
  return (
    <section>
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
    </section>
  );
}

export default function App() {
  return (
    <main>
      <h1>Profile</h1>
      <UserProfile />
    </main>
  );
}
```

`02-add-a-loading-boundary/solution.tsx`:
```tsx
import { Suspense, use } from 'react';
import { fetchUser } from '@server/users';

// Created once, outside render, so every render reads the same promise.
const userPromise = fetchUser(1);

function UserProfile() {
  const user = use(userPromise);
  return (
    <section>
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
    </section>
  );
}

export default function App() {
  return (
    <main>
      <h1>Profile</h1>
      {/* The boundary wraps only what suspends, so the heading stays put. */}
      <Suspense fallback={<p>Loading profile…</p>}>
        <UserProfile />
      </Suspense>
    </main>
  );
}
```

`02-add-a-loading-boundary/hints.md`:
```markdown
Import `Suspense` from `react`. It takes a `fallback` prop and children.
---
Wrap only the component that suspends. If you wrap `<main>` the heading disappears too, and one check will fail.
```

`02-add-a-loading-boundary/checks.tsx`:
```tsx
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'shows "Loading profile…" while the user is loading',
    // Take `ctx` whole: destructuring `Component` in the parameter list would evaluate the module
    // (and create `userPromise`) before `setLatency` runs.
    run: async (ctx) => {
      ctx.server.setLatency(300);
      const { render, screen, expect, Component } = ctx;
      render(<Component />);
      expect(screen.queryByText('Loading profile…'), 'fallback text').to.not.equal(null);
    },
  },
  {
    name: 'keeps the Profile heading visible during loading',
    run: async (ctx) => {
      ctx.server.setLatency(300);
      const { render, screen, expect, Component } = ctx;
      render(<Component />);
      expect(screen.queryByRole('heading', { level: 1, name: 'Profile' })).to.not.equal(null);
    },
  },
  {
    name: 'renders the user once loaded and removes the fallback',
    run: async (ctx) => {
      ctx.server.setLatency(50);
      const { render, screen, expect, Component } = ctx;
      render(<Component />);
      await screen.findByText('Ada Lovelace', undefined, { timeout: 2000 });
      expect(screen.queryByText('Loading profile…')).to.equal(null);
    },
  },
];
```

- [ ] **Step 3: Concept 2**

`03-transitions.md`:
````markdown
# Transitions: urgent vs. non-urgent updates

Concurrent rendering (React 18) lets React work on a render in the background and keep the current screen interactive. **Transitions** are how you tell React which updates may be treated that way.

## The problem

Click a tab, and the new tab's content suspends while its data loads. Without transitions, React does the only thing it can: hide the content under the nearest Suspense boundary and show the fallback. The user sees the tab bar (or the whole page) get replaced by a spinner for a moment. Type in a search box that filters a big list, and every keystroke waits for the list to re-render before the input updates.

## `startTransition` and `useTransition`

Wrap a state update in `startTransition` and React treats it as non-urgent:

```tsx
import { useTransition } from 'react';

const [isPending, startTransition] = useTransition();

function selectTab(next: Tab) {
  startTransition(() => setTab(next));
}
```

Three things change:

1. **Already-visible content stays on screen.** If the new render suspends, React keeps showing the old UI instead of the fallback, until the data is ready. (Fallbacks still show for content that was never visible, like on first load.)
2. **Urgent updates interrupt it.** If the user types or clicks again, React abandons the in-progress transition and starts over with the latest state.
3. **`isPending` is `true` while the transition renders**, so you can dim the old content or show a small indicator without hiding anything.

`startTransition` is also exported from `react` directly (no hook) for use outside components. In React 19 the function you pass may be `async`; that is what makes **Actions** work, which the next lesson covers.

## `useDeferredValue`

Sometimes you do not control the state update (it comes from a parent) but you do control an expensive consumer. `useDeferredValue` gives you a lagging copy of a value that React updates in a transition:

```tsx
const deferredQuery = useDeferredValue(query);
const isStale = query !== deferredQuery;
return <SlowList query={deferredQuery} style={{ opacity: isStale ? 0.6 : 1 }} />;
```

The input (`query`) updates immediately; the list catches up when React has time.

## When not to use a transition

Anything the user must see immediately (the text they typed, a toggled checkbox) is urgent; keep it a normal update. Transitions are for the *consequences* of that input: filtering, navigating, loading.

In the exercise, a tab switch suspends. Make it a transition so the current tab stays visible with a pending indicator.
````

- [ ] **Step 4: Exercise B files**

`04-keep-the-tabs-responsive/prompt.md`:
```markdown
Clicking **Posts** suspends while the posts load. Right now the whole tab panel, including the currently visible **Home** content, is replaced by the fallback.

Make the tab switch a transition so that:

1. The **Home** content stays visible while Posts loads (the fallback must not appear when switching from a visible tab).
2. The `<nav>` gets `data-pending="true"` while the transition is pending, and `"false"` otherwise, so the UI can show a subtle indicator.

Keep the `Posts` component and the `fetchPosts()` call as they are.
```

`04-keep-the-tabs-responsive/starter.tsx`:
```tsx
import { Suspense, use, useState } from 'react';
import { fetchPosts } from '@server/posts';

type Tab = 'home' | 'posts';

function Home() {
  return <p>Welcome home. Pick a tab.</p>;
}

function Posts() {
  // fetchPosts() returns a cached promise, so this is safe to call during render.
  const posts = use(fetchPosts());
  return (
    <ul>
      {posts.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');

  function select(next: Tab) {
    setTab(next);
  }

  return (
    <main>
      <nav data-pending="false">
        <button role="tab" aria-selected={tab === 'home'} onClick={() => select('home')}>
          Home
        </button>
        <button role="tab" aria-selected={tab === 'posts'} onClick={() => select('posts')}>
          Posts
        </button>
      </nav>
      <Suspense fallback={<p>Loading…</p>}>
        {tab === 'home' ? <Home /> : <Posts />}
      </Suspense>
    </main>
  );
}
```

`04-keep-the-tabs-responsive/solution.tsx`:
```tsx
import { Suspense, use, useState, useTransition } from 'react';
import { fetchPosts } from '@server/posts';

type Tab = 'home' | 'posts';

function Home() {
  return <p>Welcome home. Pick a tab.</p>;
}

function Posts() {
  // fetchPosts() returns a cached promise, so this is safe to call during render.
  const posts = use(fetchPosts());
  return (
    <ul>
      {posts.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [isPending, startTransition] = useTransition();

  function select(next: Tab) {
    // Non-urgent: keep showing the current tab until the next one is ready.
    startTransition(() => setTab(next));
  }

  return (
    <main>
      <nav data-pending={isPending ? 'true' : 'false'}>
        <button role="tab" aria-selected={tab === 'home'} onClick={() => select('home')}>
          Home
        </button>
        <button role="tab" aria-selected={tab === 'posts'} onClick={() => select('posts')}>
          Posts
        </button>
      </nav>
      <Suspense fallback={<p>Loading…</p>}>
        {tab === 'home' ? <Home /> : <Posts />}
      </Suspense>
    </main>
  );
}
```

`04-keep-the-tabs-responsive/hints.md`:
```markdown
`useTransition()` returns `[isPending, startTransition]`. Wrap the `setTab` call: `startTransition(() => setTab(next))`.
---
`data-pending` must be the string `"true"` or `"false"`, so write `data-pending={isPending ? 'true' : 'false'}`.
---
Do not remove the Suspense boundary. It is still needed for the first time Posts renders; the transition just keeps old content visible instead of showing the fallback.
```

`04-keep-the-tabs-responsive/checks.tsx`:
```tsx
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'renders the Home tab initially',
    run: ({ render, screen, expect, Component }) => {
      render(<Component />);
      expect(screen.queryByText('Welcome home. Pick a tab.')).to.not.equal(null);
    },
  },
  {
    name: 'eventually shows the posts after clicking Posts',
    run: async ({ render, screen, user, server, Component }) => {
      server.setLatency(50);
      render(<Component />);
      await user.click(screen.getByRole('tab', { name: 'Posts' }));
      await screen.findByText('Why state is a snapshot', undefined, { timeout: 2000 });
    },
  },
  {
    name: 'keeps Home visible instead of the fallback while Posts loads (transition)',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(400);
      render(<Component />);
      await user.click(screen.getByRole('tab', { name: 'Posts' }));
      expect(screen.queryByText('Loading…'), 'fallback should not replace visible content').to.equal(null);
      expect(screen.queryByText('Welcome home. Pick a tab.'), 'Home content should remain').to.not.equal(null);
    },
  },
  {
    name: 'marks the nav as pending during the transition and clears it afterwards',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(400);
      render(<Component />);
      const nav = screen.getByRole('navigation');
      expect(nav.getAttribute('data-pending')).to.equal('false');
      await user.click(screen.getByRole('tab', { name: 'Posts' }));
      expect(nav.getAttribute('data-pending'), 'while loading').to.equal('true');
      await screen.findByText('Why state is a snapshot', undefined, { timeout: 2000 });
      expect(nav.getAttribute('data-pending'), 'after loading').to.equal('false');
    },
  },
];
```

- [ ] **Step 5: lesson.ts**

```ts
import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-suspense-boundaries.md?raw';
import promptA from './02-add-a-loading-boundary/prompt.md?raw';
import starterA from './02-add-a-loading-boundary/starter.tsx?raw';
import solutionA from './02-add-a-loading-boundary/solution.tsx?raw';
import hintsA from './02-add-a-loading-boundary/hints.md?raw';
import { checks as checksA } from './02-add-a-loading-boundary/checks';
import concept2 from './03-transitions.md?raw';
import promptB from './04-keep-the-tabs-responsive/prompt.md?raw';
import starterB from './04-keep-the-tabs-responsive/starter.tsx?raw';
import solutionB from './04-keep-the-tabs-responsive/solution.tsx?raw';
import hintsB from './04-keep-the-tabs-responsive/hints.md?raw';
import { checks as checksB } from './04-keep-the-tabs-responsive/checks';

const lesson: Lesson = {
  id: '02-suspense-and-transitions',
  title: 'Suspense and transitions',
  track: 'react18',
  summary: 'Loading boundaries, startTransition, useTransition, useDeferredValue.',
  steps: [
    { kind: 'concept', id: 'suspense-boundaries', title: 'Suspense is a boundary', markdown: concept1 },
    { kind: 'exercise', id: 'add-a-loading-boundary', title: 'Add a loading boundary', prompt: promptA, files: { 'App.tsx': starterA }, solution: { 'App.tsx': solutionA }, hints: splitHints(hintsA), checks: checksA },
    { kind: 'concept', id: 'transitions', title: 'Transitions and deferred values', markdown: concept2 },
    { kind: 'exercise', id: 'keep-the-tabs-responsive', title: 'Keep the tabs responsive', prompt: promptB, files: { 'App.tsx': starterB }, solution: { 'App.tsx': solutionB }, hints: splitHints(hintsB), checks: checksB },
  ],
};

export default lesson;
```

- [ ] **Step 6: Run suite, typecheck, browser check**

Run: `pnpm typecheck && pnpm test` → PASS. The solution suite now covers 3 exercises. Expected failure modes and fixes:
- Exercise A starter: React 19 renders nothing for a root-level suspension, so "shows Loading profile…" fails on the starter (desired). If the starter instead throws an error about suspending without a boundary, that also counts as failing.
- Exercise B check 3 depends on the transition keeping the old UI. If `user.click` resolves before React processes the transition and `data-pending` reads `false`, wrap the assertion in `await act(async () => {})` via `ctx.act` before reading; do not loosen the assertion.
Browser: play both exercises end to end; confirm the preview visibly shows the fallback / pending states with the default 600ms latency.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(content): lesson 02 suspense and transitions" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Lesson 03 "Actions and optimistic UI"

**Files:**
- Create under `src/content/lessons/03-actions-and-optimistic-ui/`: `lesson.ts`, `01-actions.md`, `02-convert-the-form-to-an-action/{prompt.md,starter.tsx,solution.tsx,hints.md,checks.tsx}`, `03-optimistic-ui.md`, `04-add-optimistic-todos/{prompt.md,starter.tsx,solution.tsx,hints.md,checks.tsx}`

**Interfaces:**
- Consumes: `@server/todos` (`addTodo`, `Todo`), `useActionState` (react), `useFormStatus` (react-dom), `useOptimistic` (react).

- [ ] **Step 1: Concept 1**

`01-actions.md`:
````markdown
# Actions: async transitions with built-in pending, error, and reset

React 19 gave the transition idea a second job. If the function you pass to `startTransition` is `async`, React keeps the transition pending until the promise settles. A function used that way is called an **Action**. Forms, buttons, and a few new hooks are built around it.

## `<form action={fn}>`

Pass a function to a form's `action` prop and React will:

1. call it with the `FormData` when the form submits (no `event.preventDefault()` needed),
2. run it inside a transition, so `isPending`-style state is available,
3. **reset uncontrolled fields after the action finishes**, like a native form submission would.

```tsx
async function createTodo(formData: FormData) {
  await addTodo(String(formData.get('title')));
}

<form action={createTodo}>
  <input name="title" />
  <button>Add</button>
</form>
```

In a framework with Server Functions, `createTodo` can be marked `'use server'` and live on the server; the client code does not change. In this sandbox `@server/todos` plays that role with fake latency.

## `useActionState`

Most forms need the result of the last submission: an error message, the updated list, a success flag. `useActionState` wraps an action so its return value becomes state:

```tsx
type State = { todos: Todo[]; error: string | null };

async function submit(prev: State, formData: FormData): Promise<State> {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { ...prev, error: 'Title is required' };
  const todos = await addTodo(title);
  return { todos, error: null };
}

const [state, formAction, isPending] = useActionState(submit, { todos: [], error: null });
<form action={formAction}>…</form>
```

The action receives the **previous state** first, then the form data. Whatever it returns is the next `state`. `isPending` is true while it runs.

## `useFormStatus`

A submit button often lives in its own component so it can be reused. `useFormStatus()` reads the status of the **parent form** without prop drilling:

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Adding…' : 'Add'}</button>;
}
```

It must be rendered *inside* the `<form>`; it does not work in the component that renders the form itself.

## Error handling

Throwing inside an action propagates to the nearest error boundary. For expected failures (validation, a 4xx from the server) return them as part of the state instead, as `submit` does above.

In the exercise you will convert a hand-rolled `useState` + `onSubmit` form into an action-based one. The checks look for behavior only: pending UI, error display, and the automatic reset that only actions give you.
````

- [ ] **Step 2: Exercise A files**

`02-convert-the-form-to-an-action/prompt.md`:
```markdown
This todo form works, but it hand-rolls everything: `preventDefault`, a `pending` flag that is never set, error state, and it never clears the input.

Rewrite it with React 19 Actions:

- Use `<form action={…}>` with `useActionState` to hold `{ todos, error }`.
- Move the submit button into a `SubmitButton` component that uses `useFormStatus` to disable itself and show **Adding…** while pending.
- Show server or validation errors in an element with `role="alert"`.
- Keep the input `name="title"` and `aria-label="Title"`, and render todos as `<li>` items.

You should not need `useState`, `onSubmit`, or `preventDefault` when you are done. The input must clear after a successful add; with actions, React does that for you.
```

`02-convert-the-form-to-an-action/starter.tsx`:
```tsx
import { useState, type FormEvent } from 'react';
import { addTodo, type Todo } from '@server/todos';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending] = useState(false); // never updated

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') ?? '').trim();
    if (!title) {
      setError('Title is required');
      return;
    }
    try {
      const next = await addTodo(title);
      setTodos(next);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <input name="title" aria-label="Title" placeholder="What needs doing?" />
        <button disabled={pending}>{pending ? 'Adding…' : 'Add'}</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <ul>
        {todos.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </main>
  );
}
```

`02-convert-the-form-to-an-action/solution.tsx`:
```tsx
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addTodo, type Todo } from '@server/todos';

type State = { todos: Todo[]; error: string | null };

async function submit(prev: State, formData: FormData): Promise<State> {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { ...prev, error: 'Title is required' };
  try {
    const todos = await addTodo(title);
    return { todos, error: null };
  } catch (e) {
    return { ...prev, error: (e as Error).message };
  }
}

function SubmitButton() {
  // Reads the enclosing <form>'s status; no props needed.
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Adding…' : 'Add'}</button>;
}

export default function App() {
  const [state, formAction] = useActionState(submit, { todos: [], error: null });

  return (
    <main>
      <form action={formAction}>
        <input name="title" aria-label="Title" placeholder="What needs doing?" />
        <SubmitButton />
      </form>
      {state.error && <p role="alert">{state.error}</p>}
      <ul>
        {state.todos.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </main>
  );
}
```

`02-convert-the-form-to-an-action/hints.md`:
```markdown
Start from the action: `async function submit(prev: State, formData: FormData): Promise<State>`. Return the next state instead of calling setters.
---
`const [state, formAction] = useActionState(submit, { todos: [], error: null })`, then `<form action={formAction}>`.
---
`useFormStatus` comes from `react-dom`, not `react`, and only works in a component rendered inside the form. Make a `SubmitButton` component.
---
You do not need to clear the input yourself. When a form action completes, React resets uncontrolled fields.
```

`02-convert-the-form-to-an-action/checks.tsx`:
```tsx
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'adds a todo to the list after submitting',
    run: async ({ render, screen, user, server, Component }) => {
      server.setLatency(30);
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Walk the dog');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await screen.findByText('Walk the dog', { selector: 'li' }, { timeout: 2000 });
    },
  },
  {
    name: 'disables the button and shows "Adding…" while the server is working',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(400);
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Water plants');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      const button = screen.getByRole('button');
      expect(button.textContent).to.equal('Adding…');
      expect((button as HTMLButtonElement).disabled).to.equal(true);
      await screen.findByText('Water plants', { selector: 'li' }, { timeout: 2000 });
      expect(screen.getByRole('button').textContent).to.equal('Add');
    },
  },
  {
    name: 'clears the input after a successful add (actions reset the form)',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(30);
      render(<Component />);
      const input = screen.getByLabelText('Title') as HTMLInputElement;
      await user.type(input, 'Read a book');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await screen.findByText('Read a book', { selector: 'li' }, { timeout: 2000 });
      expect(input.value, 'input should be empty after the action completes').to.equal('');
    },
  },
  {
    name: 'shows a validation error for an empty title',
    run: async ({ render, screen, user, expect, Component }) => {
      render(<Component />);
      await user.click(screen.getByRole('button', { name: 'Add' }));
      const alert = await screen.findByRole('alert', undefined, { timeout: 2000 });
      expect(alert.textContent).to.match(/required/i);
    },
  },
  {
    name: 'shows the server error message when the server fails',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(30);
      server.failNext('Server exploded');
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Doomed todo');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      const alert = await screen.findByRole('alert', undefined, { timeout: 2000 });
      expect(alert.textContent).to.contain('Server exploded');
      expect(screen.queryByText('Doomed todo', { selector: 'li' })).to.equal(null);
    },
  },
];
```

- [ ] **Step 3: Concept 2**

`03-optimistic-ui.md`:
````markdown
# Optimistic UI with `useOptimistic`

Actions give you correct pending and error states, but the list still updates only when the server answers. For a 600ms round trip that feels sluggish: you type, click, and stare at a disabled button.

**Optimistic UI** shows the expected result immediately and reconciles when the real answer arrives. Before React 19 this meant hand-managing a shadow copy of the list and rolling it back on failure. `useOptimistic` does that bookkeeping.

```tsx
const [optimisticTodos, addOptimisticTodo] = useOptimistic(
  state.todos,                                   // the "real" value
  (current, title: string) => [                  // how to apply one optimistic update
    ...current,
    { id: -1, title, done: false, pending: true },
  ],
);
```

- `optimisticTodos` equals `state.todos` **plus** any optimistic updates applied since the last real value.
- `addOptimisticTodo(title)` applies one update. It must be called **inside an action or transition**.
- When the action finishes and `state.todos` changes (or does not, on failure), React **discards the optimistic updates automatically**. There is no manual rollback.

## Wiring it into a form action

```tsx
const [state, formAction] = useActionState(submit, initialState);
const [optimisticTodos, addOptimisticTodo] = useOptimistic(state.todos, applyAdd);

function handleAction(formData: FormData) {
  addOptimisticTodo(String(formData.get('title')));  // show it now
  formAction(formData);                               // then really do it
}

<form action={handleAction}>
```

`handleAction` runs as the form's action, so it is already inside a transition; calling `addOptimisticTodo` there is legal. `formAction` (from `useActionState`) dispatches the real submission.

## Rendering pending items

Because the optimistic item carries a flag, you can render it differently:

```tsx
<li key={t.id} data-pending={t.pending ? 'true' : undefined} style={{ opacity: t.pending ? 0.5 : 1 }}>
  {t.title}
</li>
```

Use a stable temporary key (like `` `tmp-${title}` ``) for optimistic items; they are replaced by the server's item, which has a real id.

## Failure is the interesting case

If `addTodo` rejects, `submit` returns the previous `todos` plus an error message. `state.todos` did not change, the optimistic entry is dropped, and the alert shows. You wrote no rollback code.

In the exercise, add optimistic todos to the action-based form from the previous exercise.
````

- [ ] **Step 4: Exercise B files**

`04-add-optimistic-todos/prompt.md`:
```markdown
This is the action-based form from the last exercise. Add optimistic UI so a new todo appears in the list **immediately** when you submit, before the server responds.

Requirements:

- Optimistic items render as `<li data-pending="true">`; real items have no `data-pending` attribute.
- After the server confirms, the item stays and is no longer pending.
- If the server fails, the optimistic item disappears and the error shows in the `role="alert"` element (that part already works; make sure you do not break it).

Use `useOptimistic`. Keep `submit`, `SubmitButton`, and the input attributes as they are.
```

`04-add-optimistic-todos/starter.tsx`: identical to `02-convert-the-form-to-an-action/solution.tsx` (copy the file).

`04-add-optimistic-todos/solution.tsx`:
```tsx
import { useActionState, useOptimistic } from 'react';
import { useFormStatus } from 'react-dom';
import { addTodo, type Todo } from '@server/todos';

type State = { todos: Todo[]; error: string | null };
type OptimisticTodo = Todo & { pending?: boolean };

async function submit(prev: State, formData: FormData): Promise<State> {
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { ...prev, error: 'Title is required' };
  try {
    const todos = await addTodo(title);
    return { todos, error: null };
  } catch (e) {
    return { ...prev, error: (e as Error).message };
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Adding…' : 'Add'}</button>;
}

export default function App() {
  const [state, formAction] = useActionState(submit, { todos: [], error: null });
  const [optimisticTodos, addOptimisticTodo] = useOptimistic<OptimisticTodo[], string>(
    state.todos,
    (current, title) => [...current, { id: -Date.now(), title, done: false, pending: true }],
  );

  function handleAction(formData: FormData) {
    const title = String(formData.get('title') ?? '').trim();
    if (title) addOptimisticTodo(title); // show it now; React drops it when `state.todos` updates
    formAction(formData);                 // then actually submit
  }

  return (
    <main>
      <form action={handleAction}>
        <input name="title" aria-label="Title" placeholder="What needs doing?" />
        <SubmitButton />
      </form>
      {state.error && <p role="alert">{state.error}</p>}
      <ul>
        {optimisticTodos.map((t) => (
          <li key={t.id} data-pending={t.pending ? 'true' : undefined} style={{ opacity: t.pending ? 0.5 : 1 }}>
            {t.title}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

`04-add-optimistic-todos/hints.md`:
```markdown
`const [optimisticTodos, addOptimisticTodo] = useOptimistic(state.todos, (current, title: string) => [...current, { id: -1, title, done: false, pending: true }])`. Render `optimisticTodos`, not `state.todos`.
---
Wrap the form action: a function that calls `addOptimisticTodo(title)` and then `formAction(formData)`. Pass that wrapper to `<form action>`; it runs inside a transition, which is where `addOptimisticTodo` must be called.
---
For the `data-pending` attribute, use `data-pending={t.pending ? 'true' : undefined}` so real items have no attribute at all.
```

`04-add-optimistic-todos/checks.tsx`:
```tsx
import type { Check } from '../../../types';

export const checks: Check[] = [
  {
    name: 'shows the new todo immediately as pending, before the server responds',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(500);
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Walk the dog');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      const item = screen.queryByText('Walk the dog', { selector: 'li' });
      expect(item, 'todo should be in the list right away').to.not.equal(null);
      expect(item?.getAttribute('data-pending'), 'optimistic item should be marked pending').to.equal('true');
    },
  },
  {
    name: 'after the server confirms, the todo stays and is no longer pending',
    run: async ({ render, screen, user, expect, server, Component, sleep }) => {
      server.setLatency(100);
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Water plants');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await sleep(400);
      const items = screen.getAllByText('Water plants', { selector: 'li' });
      expect(items.length, 'exactly one item, not an optimistic duplicate').to.equal(1);
      expect(items[0]?.getAttribute('data-pending')).to.equal(null);
    },
  },
  {
    name: 'removes the optimistic todo and shows the error when the server fails',
    run: async ({ render, screen, user, expect, server, Component }) => {
      server.setLatency(100);
      server.failNext('Server exploded');
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Doomed todo');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      const alert = await screen.findByRole('alert', undefined, { timeout: 2000 });
      expect(alert.textContent).to.contain('Server exploded');
      expect(screen.queryByText('Doomed todo', { selector: 'li' }), 'optimistic item should be rolled back').to.equal(null);
    },
  },
  {
    name: 'still resets the input after a successful add',
    run: async ({ render, screen, user, expect, server, Component, sleep }) => {
      server.setLatency(50);
      render(<Component />);
      const input = screen.getByLabelText('Title') as HTMLInputElement;
      await user.type(input, 'Read a book');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await sleep(300);
      expect(input.value).to.equal('');
    },
  },
];
```

- [ ] **Step 5: lesson.ts**

```ts
import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-actions.md?raw';
import promptA from './02-convert-the-form-to-an-action/prompt.md?raw';
import starterA from './02-convert-the-form-to-an-action/starter.tsx?raw';
import solutionA from './02-convert-the-form-to-an-action/solution.tsx?raw';
import hintsA from './02-convert-the-form-to-an-action/hints.md?raw';
import { checks as checksA } from './02-convert-the-form-to-an-action/checks';
import concept2 from './03-optimistic-ui.md?raw';
import promptB from './04-add-optimistic-todos/prompt.md?raw';
import starterB from './04-add-optimistic-todos/starter.tsx?raw';
import solutionB from './04-add-optimistic-todos/solution.tsx?raw';
import hintsB from './04-add-optimistic-todos/hints.md?raw';
import { checks as checksB } from './04-add-optimistic-todos/checks';

const lesson: Lesson = {
  id: '03-actions-and-optimistic-ui',
  title: 'Actions and optimistic UI',
  track: 'react19',
  summary: 'useActionState, useFormStatus, form actions, useOptimistic.',
  steps: [
    { kind: 'concept', id: 'actions', title: 'Actions', markdown: concept1 },
    { kind: 'exercise', id: 'convert-the-form-to-an-action', title: 'Convert the form to an action', prompt: promptA, files: { 'App.tsx': starterA }, solution: { 'App.tsx': solutionA }, hints: splitHints(hintsA), checks: checksA },
    { kind: 'concept', id: 'optimistic-ui', title: 'Optimistic UI', markdown: concept2 },
    { kind: 'exercise', id: 'add-optimistic-todos', title: 'Add optimistic todos', prompt: promptB, files: { 'App.tsx': starterB }, solution: { 'App.tsx': solutionB }, hints: splitHints(hintsB), checks: checksB },
  ],
};

export default lesson;
```

- [ ] **Step 6: Run suite, typecheck, browser check**

Run: `pnpm typecheck && pnpm test` → PASS for all 5 exercises. Known sensitivities:
- Exercise A "pending" check: after `user.click`, the transition has started and `useFormStatus` reports pending; if the assertion reads `Add`, wrap it in `await act(async () => {})` first.
- Exercise B check 1: the optimistic state commits synchronously within the action dispatch; same `act` trick if needed.
- If the "starter fails" test for Exercise B passes when it should fail (starter already satisfies a check), the discriminating check is number 1 (immediate pending item); confirm it fails on the starter.
Browser: with the default 600ms latency, the optimistic item visibly appears at half opacity and then solidifies; toggling failure is not exposed in the UI, which is fine.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(content): lesson 03 actions and optimistic UI" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: README, authoring guide, and final verification

**Files:**
- Create: `README.md`, `docs/authoring-lessons.md`
- Modify: none required; fix anything the final verification surfaces.

- [ ] **Step 1: README**

`README.md`:
```markdown
# React Refresher

A personal, local-first course that alternates between teaching a React concept and making you use it in an in-browser sandbox. Built for someone coming from React 18 who wants to be current on React 19, the React Compiler, and the 2026 ecosystem.

## Run it

    pnpm install
    pnpm dev          # http://localhost:5173

Progress (completed steps, your exercise code, quiz answers) is written to `progress/progress.json` by the dev server. Commit it if you want history; export/import from the dashboard as a backup.

## Scripts

    pnpm test         # Vitest: unit tests + every exercise's solution passes / starter fails
    pnpm typecheck    # TypeScript 7 (native) over app, sandbox, and lesson files
    pnpm check        # both
    pnpm build        # static build (progress falls back to localStorage)

## How it works

- `src/content/lessons/*/lesson.ts` defines a lesson as ordered steps: `concept` (markdown), `exercise` (starter files, solution, hints, checks), `quiz`.
- Exercises run in `preview.html`, a separate Vite entry loaded in an iframe. Your code is compiled with Sucrase to CommonJS and evaluated against a fixed module registry (`react`, `react-dom`, `@server/*`). Checks are written with Testing Library and run in the iframe; the same checks run in Vitest against each solution.
- `@server/*` modules simulate a server with latency and a failure switch, standing in for Server Functions.

See `docs/authoring-lessons.md` to add lessons and `docs/research/2026-09-17-react-landscape.md` for the research behind the curriculum.
```

- [ ] **Step 2: Authoring guide**

`docs/authoring-lessons.md`:
````markdown
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

## Sandbox limits

User code can import only: `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, and `@server/todos|users|posts`. To expose a new server module, add it under `src/sandbox/server/`, register it in `src/sandbox/registry.ts`, and list it in the plan's Global Constraints.
````

- [ ] **Step 3: Final verification (evidence before claims)**

Run each and record the output:

```bash
pnpm typecheck
pnpm test
pnpm build
```
Expected: all exit 0. `pnpm test` shows the solution suite with 5 exercises × 3 tests plus unit/component tests.

Then `pnpm dev`, and walk every lesson end to end in the browser: dashboard → each step → exercises pass with the solution and fail with the starter → quiz completes → dashboard shows all three lessons "Done" → `progress/progress.json` reflects it. Reset progress afterwards if desired by restoring the empty file (`git checkout progress/progress.json`).

Also confirm: theme toggle persists; the save indicator shows "Saved" after edits; export downloads a JSON file; import of that file restores state; the console panel shows `console.log` output from user code.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: README and lesson authoring guide" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage:** content model (Task 2, 11-13), sandbox runtime and simulated server (Tasks 3-5, 7), progress plugin + store + fallback + export/import (Task 6, 8), dashboard with locked placeholders (Task 8), lesson stepper with all three step kinds (Tasks 9-10), error handling for compile/runtime/timeouts/save failures (Tasks 5-8, 10), testing including the solution-validation suite (Tasks 3-11), three seed lessons (Tasks 11-13), success criteria verified (Task 14).
- **Deviations from spec, intentional:** `checks.ts` became `checks.tsx` because checks contain JSX. `CheckContext` gained `Component` and `sleep` conveniences; `mod` is lazy. Store gained `clearQuiz`, `clearCode`, `uncompleteStep`, `flush` beyond the spec's list.
- **Type consistency:** `stepKey`, `findExercise`, `getCurriculumView`, `runChecks` (`{kind:'compile-error'|'results'}`), `SandboxState.phase` values, `ProgressStore` method names are used identically across tasks. `PREVIEW_PATH` is `/preview.html` everywhere.
