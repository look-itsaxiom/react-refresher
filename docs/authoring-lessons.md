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

User code can import only: `react`, `react/jsx-runtime`, `react-dom`, `react-dom/client`, and `@server/todos|users|posts`. To expose a new server module, add it under `src/sandbox/server/`, register it in `src/sandbox/registry.ts`, and list it in the plan's Global Constraints.

## Recurring rulings

These have come up repeatedly across lessons and are settled, not open questions:

- The checks file is named `checks.tsx` (not `checks.ts`) because checks contain JSX.
- Each check gets a fresh module evaluation — module-level state from one check never leaks into the next.
- `server` defaults to latency 0 for every check; a check that needs latency sets it explicitly.
