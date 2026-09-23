# A strategy, not a pyramid argument

Every few years the frontend world re-argues the "testing pyramid" — lots of unit tests, fewer
integration tests, a handful of end-to-end tests — versus the "testing trophy" counter-argument
that component-level integration tests give the best confidence per dollar. By September 2026 the
argument itself is mostly settled and mostly beside the point. What changed is the cost side of
the trade-off, not the shape of the trophy: TypeScript and linting catch a whole category of bugs
before a test ever runs, and Vitest 5's Browser Mode (shipped September 3, 2026) makes a real,
rendered-in-Chromium component test about as cheap to write and run as a jsdom one used to be. The
useful question was never "which shape," it's "what does each layer buy me, and what does it cost
when it breaks."

## The layers, and what each one should assert

| Layer | Runs in | Answers | Should NOT assert |
|---|---|---|---|
| Types + lint | Editor/CI, no runtime | Is this shape even possible? | Behavior — a type check passing says nothing about what the code does |
| Unit (Vitest) | Node or jsdom | Does this pure function/reducer produce the right output for this input? | Anything about rendering, styling, or DOM structure |
| Component (Testing Library, Vitest Browser Mode) | Real browser or jsdom | Given this DOM state, can a user accomplish the task via roles and labels? | Internal state, prop names, which hooks fired |
| Integration | Real browser, real-ish network via MSW | Do several components and a data layer cooperate correctly? | Full navigation, third-party services |
| End-to-end (Playwright) | Real browser, real app, maybe real backend | Does the critical path work across pages, in a real browser, for a real user? | Every edge case — e2e is for the flows you'd get paged for |
| Visual (Chromatic/Argos) | Rendered snapshot diff | Did the pixels change unexpectedly? | Correctness — a visual diff tells you *what* changed, not whether it's a bug |

Each layer down this table gets more confidence and more cost: slower to run, slower to write,
and — critically — more expensive to diagnose when it fails, because more of the system is in
play. A failing unit test points at one function. A failing e2e test might be the app, the test
infra, a flaky third-party script, or the network. Budget accordingly: most projects want a large
base of unit and component tests, a thin layer of integration tests around real seams (auth,
payment, checkout), and e2e reserved for the handful of flows where "it works end to end in a
browser" is the actual requirement, not a nice-to-have.

## Flakiness has sources, not just symptoms

A flaky test wastes more time than a slow one, because it teaches the team to ignore red CI.
Flakiness in frontend tests almost always traces to one of four sources: unmocked time (a
`setTimeout` or animation the test didn't account for), unmocked randomness, a race against a real
network, or an assertion that ran before an async update settled (missing `await waitFor(...)` or
`await user.click(...)`). None of these are "the test framework is unreliable" — they're testable
determinism gaps in the code or the test itself. Give every suite an explicit flake budget: a test
that fails intermittently gets fixed or deleted within a sprint, not muted with a retry flag
forever. Playwright 1.63 and Vitest 5's Browser Mode both ship trace/replay tooling specifically
because "it failed once and I can't reproduce it" is the single most expensive class of test bug.

## Test doubles: mock the network, not the module

`vi.mock('./api')` replaces a module with a fake implementation your test controls completely —
which also means it stops testing whether your code calls the real API correctly (right URL, right
method, right headers, right error shape). Mock Service Worker (MSW 2, currently 2.15) intercepts
at the network layer using the standard `Request`/`Response` APIs, so the same handlers work in
tests, local dev, and Storybook, and your component's actual `fetch` call is exercised end to end
except for the wire. Reach for a module mock only for something that has no network shape at all —
a wrapped `Date.now()`, a randomness source, a browser API jsdom doesn't implement.

## Snapshots, coverage, and AI-written tests

Snapshot tests earn their keep for output that's tedious to hand-write and rarely changes on
purpose — a generated CSS-in-JS class list, a serialized AST — and rot into noise everywhere else,
because a snapshot diff proves something changed, not that the change is correct; a rubber-stamped
`--update-snapshots` is not a passing test. Coverage percentage is a smell detector, not a target:
0% on a file means nothing is tested; a coverage *drop* on a PR means new code shipped with no
tests. Chasing a global number produces tests that execute lines without asserting behavior — the
worst kind of green checkmark. That risk got sharper with AI-assisted test generation: a model
asked to "add tests" will happily produce exactly that, plausible-looking assertions that never
fail. Review a generated test by breaking the code on purpose and confirming the test catches it —
the same mutation-testing instinct you'd apply to a human's PR, applied more often because the
volume of generated tests is higher.

## Further reading (optional)

- [Vitest 5.0 announcement](https://vitest.dev/blog/vitest-5.html) — vitest.dev
- [Vitest Browser Mode guide](https://vitest.dev/guide/browser/) — vitest.dev
- [State of JavaScript 2025: Testing](https://2025.stateofjs.com/en-US/libraries/testing/) — stateofjs.com
- [Mock Service Worker docs](https://mswjs.io/docs/) — mswjs.io
