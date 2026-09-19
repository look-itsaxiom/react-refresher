# React Refresher

A personal, local-first course that alternates between teaching a concept and making you use it in an in-browser sandbox. Built for someone coming from React 18 who wants to be current on React 19, the React Compiler, and the 2026 frontend map: 101 lessons across 21 tracks (React, web platform, tooling, testing, rendering, performance, accessibility, security, auth, GraphQL, web components, PWAs, deployment, design systems, AI-assisted development), plus an in-progress interview-prep expansion with Go, PostgreSQL, and system-design tracks.

## Run it

    pnpm install
    pnpm dev          # http://127.0.0.1:5180

The port is fixed at 5180 because another local project's service worker can shadow the Vite default.

Progress (completed steps, your exercise code, quiz answers) is written to `progress/progress.json` by the dev server. The file is git-ignored; export/import from the dashboard as a backup.

## Scripts

    pnpm test           # Vitest: unit tests + every exercise's solution passes / starter fails
    pnpm typecheck      # TypeScript 7 (native) over app, sandbox, and lesson files
    pnpm check          # both
    pnpm build          # static build (progress falls back to localStorage)
    pnpm deploy:pages   # build for GitHub Pages and push to the gh-pages branch

## How it works

- `src/content/lessons/*/lesson.ts` defines a lesson as ordered steps: `concept` (markdown), `exercise` (starter files, solution, hints, checks), `quiz`.
- Browser exercises run in `preview.html`, a separate Vite entry loaded in an iframe. Your code is compiled with Sucrase to CommonJS and evaluated against a fixed module registry (`react`, `react-dom`, `@server/*`). Checks are written with Testing Library and run in the iframe; the same checks run in Vitest against each solution.
- SQL exercises run on PGlite, PostgreSQL compiled to WebAssembly and loaded on demand; each check starts from an empty schema.
- Go exercises live in `exercises-local/` as real Go modules. The dev server grades them by running `go test` (Go 1.22+ on your PATH); the validation suite proves each starter fails and each solution passes.
- `@server/*` modules simulate a server with latency and a failure switch, standing in for Server Functions.
- A synchronous infinite loop in learner code freezes the preview tab; the 5s watchdog only covers async hangs. Reload the page to recover.

## Hosted build

`pnpm deploy:pages` builds with `base: /react-refresher/` and pushes `dist` to `gh-pages`. On GitHub Pages the app stores progress in localStorage, SQL exercises still run, and Go exercises show the folder and command to run yourself with a manual "Mark complete" (the `go test` runner needs the dev server).

See `docs/authoring-lessons.md` to add lessons, `docs/authoring-runbook.md` for the autonomous authoring procedure, and `docs/research/2026-09-17-react-landscape.md` for the research behind the curriculum.
