## Mocks, time, and the browser

### `vi.fn` and `vi.spyOn`

`vi.fn(impl?)` creates a standalone mock function: call it, and it records every call in
`mock.calls` (an array of argument arrays) and every return value in `mock.results`. Configure
behavior with `mockReturnValue`, `mockResolvedValue`/`mockRejectedValue` for promise-returning
callers, or `mockImplementation` for full control — each has a `*Once` variant that applies for a
single call and then falls back to the default.

`vi.spyOn(object, 'method')` does the same thing but wraps an *existing* method in place, so the
real object keeps working with everything except the one method you're watching — call
`.mockRestore()` (or set `restoreMocks: true` globally) to put the original implementation back.
Since Vitest 5 defaults `clearMocks: true`, call history resets automatically between tests, but the
mocked *implementation* does not — a spy configured with `mockReturnValue` in one test still returns
that value in the next unless you restore it.

### Module mocking and hoisting

`vi.mock('./module', factory)` replaces every import of `./module` for the rest of the file — but
the trap is *when* it runs. Vitest hoists `vi.mock` calls to the top of the file, before your own
`import` statements execute, so the mock is in place before anything (including your own top-level
code) can import the real module. That hoisting is also why you can't reference a variable declared
with `const` in your factory — it hasn't been initialized yet at hoist time. `vi.hoisted(() => {...})`
exists exactly for this: it runs *its* callback before the hoisted `vi.mock` calls too, so you can
build shared mock state and hand it to the factory:

```ts
const { mockFetchUser } = vi.hoisted(() => ({ mockFetchUser: vi.fn() }));
vi.mock('./api', () => ({ fetchUser: mockFetchUser }));
```

When you only need to replace *part* of a module, the factory's `importOriginal()` gets you the real
module to spread from: `vi.mock('./api', async (importOriginal) => ({ ...(await importOriginal()),
fetchUser: vi.fn() }))`. `vi.doMock` is the non-hoisted sibling — it applies only for imports that
happen after it runs, useful inside a single test rather than for the whole file.

**Why prefer MSW over `vi.mock('./api')` for network code.** This course's lesson 19 already made
this case at the module level; it applies just as much at the mock level. Mocking the module that
does the fetching deletes the code path you meant to test — you no longer know if your component
builds the right URL, sends the right method, or handles a real error response, because `fetchUser`
never ran. Intercepting at the network layer (MSW, or this repo's own `@server/*` fakes reached
through `ctx.server` in `checks.tsx`) keeps the real `fetch` call under test and the same handlers
work in Storybook and local dev, not just inside Vitest. The next lesson in this track covers MSW
directly; the rule to carry forward is: mock at the boundary you don't own, not the code you wrote.

### Fake timers

`vi.useFakeTimers()` replaces `setTimeout`, `setInterval`, `Date`, and friends with a controllable
clock. Nothing fires until you advance it:

- `vi.advanceTimersByTime(ms)` fires every timer due within `ms`, synchronously.
- `vi.advanceTimersByTimeAsync(ms)` does the same but flushes microtasks between each timer firing —
  required whenever a fired callback itself does something async (an `await`, a `.then`), or the
  callback's continuation won't have run by the time `advanceTimersByTime` returns.
- `vi.runAllTimers()` / `vi.runAllTimersAsync()` fire everything currently queued, including timers
  scheduled by other timers as they fire — dangerous with a `setInterval` that never gets cleared,
  since it'll spin until Vitest's own runaway-timer guard kills it.
- `vi.setSystemTime(date)` freezes `Date.now()`/`new Date()` at a fixed instant, independent of the
  timer queue — useful for the "fixed `now`" injection pattern from lesson 19's `OrderSummary`
  exercise, without even needing a `now` prop if the component reads `Date.now()` directly.

The classic pitfall: fake timers and Testing Library's `waitFor` (which itself polls using real
timers, by default) fight each other. If you fake timers and then `await waitFor(...)`, `waitFor`'s
own internal polling never advances, because the clock it's using is frozen — you must
`await vi.advanceTimersByTimeAsync(...)` yourself instead of reaching for `waitFor` under fake
timers. Always call `vi.useRealTimers()` in an `afterEach` (or rely on `restoreMocks`/manual
teardown) so a frozen clock from one test doesn't leak into the next.

### Browser Mode

Everything above still runs in jsdom or `node` — a simulation. Vitest's **Browser Mode** runs your
test file's assertions against a *real* browser instance, driven by either the Playwright or
WebdriverIO provider, configured under `test.browser` in your Vite config. Instead of `render` from
`@testing-library/react` producing a jsdom tree, Browser Mode gives you `page` and `userEvent` from
`vitest/browser`, backed by real `Locator`-style APIs (`page.getByRole(...).click()`) that wait for
elements the way Playwright's own test runner does.

The trade-off is real: a real browser boots slower per file than jsdom, and CI needs a real browser
binary installed, not just a JS DOM shim. What you get back is fidelity jsdom structurally cannot
provide — real CSS layout and `getBoundingClientRect`, real focus order and `:focus-visible`, a real
accessibility tree, real `ResizeObserver`/`IntersectionObserver`. Reach for Browser Mode for
components where the bug *is* the rendering — layout-dependent behavior, drag-and-drop, canvas,
anything your component does with actual pixel geometry — and keep jsdom as the default for
everything else; it is not a wholesale replacement for jsdom-based component tests, which remain
faster and sufficient for logic-and-markup assertions.

### Coverage

`vitest run --coverage` needs a provider: `@vitest/coverage-v8` (uses V8's built-in coverage,
default and fastest) or `@vitest/coverage-istanbul` (uses Istanbul/`@vitest/istanbuljs`, slower but
supports source maps back through more transform chains and gives more precise branch data in some
edge cases). Set thresholds in config (`test.coverage.thresholds.lines`, etc.) to fail CI when
coverage drops — treat thresholds as a floor against regressions, not a target; 100% coverage proves
every line executed, not that it executed correctly, which is the same gap this course's lesson 19
quiz raises about AI-generated tests that pass by never really asserting anything.

### Projects: one runner, many environments

A single repo often needs jsdom for component tests and `node` for a small server package, or
different `setupFiles` per package. `test.projects` in your root Vitest config (an array of glob
patterns to sub-configs, inline config objects, or both) replaces the older separate
`vitest.workspace.ts` file mechanism, letting one `vitest` invocation run every project together
while each project keeps its own `environment`, `setupFiles`, and plugins. Vitest 5 lets a project
declared this way nest further sub-projects, and inline projects now inherit the root config
(plugins, `resolve.alias`) by default instead of starting from nothing — so a monorepo doesn't have
to repeat its Vite plugin list in every project entry.

### CI ergonomics

A few flags matter specifically for CI, not local dev: `--reporter=junit` (or `--reporter=github-actions`)
emits a format your CI's test-reporting UI understands instead of Vitest's default terminal output;
`--shard=1/4` splits a suite across parallel CI jobs by hashing test files into buckets, cutting wall
time when a suite is too large for one runner; `--changed` (comparing against a git ref, e.g.
`--changed origin/main`) runs only the tests whose files — or files they import — changed, which is
the difference between a 30-second and a 10-minute pre-commit hook on a large repo.

### Further reading

- [Vitest — Mocking](https://vitest.dev/guide/mocking.html)
- [Vitest — API: vi](https://vitest.dev/api/vi.html)
- [Vitest — Browser Mode](https://vitest.dev/guide/browser/)
- [Vitest — Test Projects](https://vitest.dev/guide/projects.html)
- [Vitest — Coverage](https://vitest.dev/guide/coverage.html)
