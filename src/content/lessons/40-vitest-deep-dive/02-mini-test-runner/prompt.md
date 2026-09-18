You use `describe`/`it`/`beforeEach`/`afterEach` every day, but never had to make the ordering
rules actually happen. Implement `createRunner(options?)` so it returns `{ describe, it,
beforeEach, afterEach, run }`:

- `describe(name, fn)` runs `fn` immediately to register a nested suite's children —
  `describe`/`it`/`beforeEach`/`afterEach` calls made inside `fn` belong to that suite, not
  its parent.
- `it(name, fn)` registers a test. `fn` may be sync or async.
- `it.skip(name, fn)` registers a test that is never run — it counts toward the report's
  `skipped` total, and `fn` must never be called.
- `it.only(name, fn)` — if *any* test anywhere in the tree was registered with `.only`, then
  only `.only` tests run when `run()` is called; every other test (including ones nested in
  unrelated suites) counts as `skipped` instead of running.
- `beforeEach(fn)` / `afterEach(fn)` register a hook on whichever suite is "current" at the
  point they're called (the root counts as a suite too). For a given test, every ancestor
  suite's `beforeEach` hooks run **outermost-first**, then the test runs, then every ancestor's
  `afterEach` hooks run **innermost-first** — and the `afterEach` chain still runs even if the
  test threw.
- Give each test a fixed timeout (`options.timeoutMs`, default `2000`). A test whose promise
  never settles within that window counts as failed, with an error message that mentions the
  timeout — the run must not hang waiting on it.
- `run()` resolves a report: `{ passed: number, failed: { fullName: string; error: string
  }[], skipped: number }`. `fullName` joins every ancestor `describe` name and the test's own
  name with `" > "` (a root-level test with no `describe` around it just uses its own name).
  `error` is the thrown value's message (or its string form, if it isn't an `Error`).

The starter's default export already builds a tiny suite and prints whatever `run()` resolves
to, so you can see your runner working in the preview as you go.
