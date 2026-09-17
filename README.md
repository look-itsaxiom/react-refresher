# React Refresher

A personal, local-first course that alternates between teaching a React concept and making you use it in an in-browser sandbox. Built for someone coming from React 18 who wants to be current on React 19, the React Compiler, and the 2026 ecosystem.

## Run it

    pnpm install
    pnpm dev          # http://localhost:5180

The port is fixed at 5180 because another local project's service worker can shadow the Vite default.

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
