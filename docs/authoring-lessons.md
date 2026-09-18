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

User code can import only: `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client`, and `@server/todos|users|posts`. To expose a new server module, add it under `src/sandbox/server/`, register it in `src/sandbox/registry.ts`, and list it in the plan's Global Constraints.
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
