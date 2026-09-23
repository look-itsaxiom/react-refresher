## Vitest as a system, not a Jest clone

By September 2026 you've almost certainly run `vitest` a thousand times without thinking about
what it actually is: a test runner built on the same Vite pipeline that serves your app in dev.
That single fact explains most of its behavior. Your test files go through the same esbuild/Rollup
transform pipeline, the same plugins, the same `resolve.alias` table as `vite.config.ts` — this repo's
own `vite.config.ts` registers `@server` as an alias and Vitest resolves it identically, because
`test` is a key on the *same* config object, not a separate tool reading a separate file. There's no
second bundler to keep in sync, no Babel-vs-SWC mismatch between "how the app builds" and "how the
test transforms JSX." If a lesson's sandboxed exercise compiles under Vite, it'll compile under Vitest.

### Environments

A test file runs in one of four environments, chosen per-file or globally:

- **`node`** — no DOM at all. Fastest. Correct for pure functions, CLI tools, server code.
- **`jsdom`** — a pure-JS DOM implementation, no real layout or rendering. This project uses it
  (`vite.config.ts`: `test.environment: 'jsdom'`), because most exercises render a component and
  assert on `getByRole`/`getByText` output, not on pixels.
- **`happy-dom`** — a faster, less complete jsdom alternative. Swap in when jsdom's fidelity gaps
  (missing `ResizeObserver`, incomplete `Range`, etc.) don't matter and you want raw speed.
  `docs/authoring-lessons.md` calls out that this course's sandbox avoids APIs jsdom lacks rather
  than switching environments, since exercises need one environment for every check.
- **Browser Mode** — a real browser (see below). Not a jsdom alternative so much as a different
  tier of confidence: real layout, real `getComputedStyle`, real focus/tab order.

jsdom is a simulation. It gets `element.click()` right but has no visual layout engine — no
`getBoundingClientRect` that reflects actual CSS, no real `IntersectionObserver`, no real paint
timing. That's a deliberate trade: for logic-heavy component tests, a jsdom test is 10-100x faster
to boot than a browser and "close enough" almost always suffices. When your bug lives in actual
layout, actual rendering, or a real accessibility tree, jsdom cannot see it — that's what Browser
Mode is for.

### The test lifecycle

`describe` nests suites; `it`/`test` (aliases of each other) register cases. Hooks run in a strict
order: outer `beforeEach` before inner `beforeEach`, then the test, then inner `afterEach` before
outer `afterEach` — same nesting Jest trained you on. `beforeAll`/`afterAll` run once per describe
block regardless of how many tests it contains.

Two knobs matter more in Vitest than they did in Jest:

- **Isolation.** Vitest gives each test *file* a fresh module registry by default — global state set
  at module scope in one file never leaks into another. `docs/authoring-lessons.md` leans on this
  hard: "Each check gets a fresh module evaluation" is the same guarantee, applied per-check instead
  of per-file, so a check that sets `server.setLatency(300)` never contaminates the next check.
- **Concurrency.** Tests within a file run sequentially by default; `describe.concurrent` or
  `test.concurrent` opt a block into parallel execution *within* that isolated context. Concurrent
  tests share module state with each other, so mutable module-level fixtures become a race — reach
  for concurrency only when tests are provably independent.

`test.each` (and `describe.each`) turn a table of inputs into N generated tests, printing each row's
values into the test name — the same mechanism `src/content/__tests__/solutions.test.ts` in this repo
uses, just manually: it `flatMap`s every registered lesson's exercise steps into an array and then
loops with a plain `for...of`, calling `describe`/`it` inside the loop to generate one nested
`describe` block per exercise. `test.each` is the built-in version of that same pattern when your
table is data rather than "every exercise in the course."

### Assertions: two roots, one API

`expect(value)` is Vitest's own implementation of the Jest assertion API, layered on top of
**Chai** — `chai`'s `expect` (what this course's `checks.tsx` files import as `ctx.expect`) is the
older, BDD-style root Vitest re-exports for compatibility and for exactly this kind of embedding.
The chai form reads `expect(x).to.equal(y)`; Vitest's own form reads `expect(x).toBe(y)`. Inside
this repo's checks you'll only ever see the chai style, because `CheckContext.expect` is typed as
`typeof chaiExpect` — a deliberate choice so a check can run standalone chai assertions without
pulling in a full Vitest test context.

A few matcher distinctions that bite in review:

- **`toEqual` vs `toStrictEqual`.** `toEqual` ignores `undefined` properties and doesn't check
  prototypes — `{ a: 1, b: undefined }` equals `{ a: 1 }`, and a plain object equals a class instance
  with the same shape. `toStrictEqual` checks both. Default to `toEqual` for "same data," reach for
  `toStrictEqual` when the type of the object is part of what you're testing.
- **Asymmetric matchers** — `expect.any(String)`, `expect.objectContaining({...})`,
  `expect.arrayContaining([...])` — let you assert "this field is *some* ISO string" inside a larger
  `toEqual`, instead of hand-picking fields to check individually.
- **`expect.poll`** re-runs an assertion against a value that arrives asynchronously —
  `await expect.poll(() => getStatus()).toBe('done')` — retrying until it passes or times out. It's
  the Vitest-native answer to Testing Library's `waitFor`, useful when the thing you're polling isn't
  DOM-shaped (a queue length, a WebSocket state) and pulling in Testing Library just for `waitFor`
  would be overkill.
- **`expect.soft`** records a failure but keeps running the rest of the test instead of throwing
  immediately — useful for "check five independent things about this render, report all five
  failures in one run" instead of stopping at the first.

### Snapshots: file vs. inline, and when they're worth it

`toMatchSnapshot()` writes (or diffs against) a `.snap` file next to your test. `toMatchInlineSnapshot()`
writes the expected value directly into your test source, which Vitest edits in place on
`--update-snapshots` — no separate file to review, the diff shows up in the same PR hunk as the
assertion. Both answer the same question differently: "does this output still look like this?"

Lesson 19 in this course already made the strategic case against snapshotting ordinary component
markup — it fails on every unrelated change and gets rubber-stamped away with `--update-snapshots`,
which means it stops catching anything real. Snapshots earn their keep on stable, tedious-to-hand-write
output: a compiled CSS class list, a serialized AST, a generated SQL string, a large fixture object.
As of Vitest 5, an unresolved/unawaited `toMatchFileSnapshot` now fails the test outright instead of
just warning — the same "await your assertions or the test lies to you" tightening that landed for
`resolves`/`rejects`.

### What changed, v4 → v5

Three changes are worth knowing by name, because code and blog posts written before 2026 predate them:

- **`clearMocks` now defaults to `true`.** Vitest 5 calls `vi.clearAllMocks()` before every test
  automatically — every mock's `.calls`/`.results` history resets, though implementations
  (`mockImplementation`) survive. Earlier versions defaulted this to `false`, so mock call counts
  silently accumulated across tests unless you cleared them yourself. If you're maintaining an older
  suite, an upgrade to v5 can make a test that "coincidentally" worked start failing correctly — check
  for tests that assumed leftover call counts from a previous test.
  Note: `clearMocks` only clears; it does not restore spied-on globals to their original
  implementation. That's what `restoreMocks` is for, and it still defaults to `false`.
- **Vite 6.4+ and Node 22.12+ are required.** Vitest 5 raised its floor; this repo's Vite 8 and
  current Node LTS are well past it.
- **Nested `test.projects` and inherited config.** A project referenced inside `test.projects` can
  itself declare sub-projects, and inline projects now inherit the root config (plugins, aliases)
  instead of starting from a blank slate — see the projects section below.

### Further reading (optional)

- [Vitest — Guide: Test Context and Environments](https://vitest.dev/guide/environment.html)
- [Vitest 5.0 announcement](https://vitest.dev/blog/vitest-5.html)
- [Vitest — API: expect](https://vitest.dev/api/expect.html)
- [Vitest — Guide: Snapshot](https://vitest.dev/guide/snapshot.html)
