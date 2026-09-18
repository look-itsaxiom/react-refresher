import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A component test suite has to render actual CSS layout, verify `getBoundingClientRect`, and check real focus order for a drag-and-drop list. It currently runs under `environment: \'jsdom\'`. What is the right move?',
      choices: [
        { id: 'a', text: 'Switch to `happy-dom`, which is faster than jsdom and will pick up the missing layout behavior.' },
        {
          id: 'b',
          text: 'Move that suite (or just those tests) to Vitest Browser Mode, since jsdom has no real layout engine and structurally cannot produce accurate geometry or focus order — happy-dom has the same gap.',
        },
        { id: 'c', text: 'Add more `expect.poll` calls around the assertions until jsdom eventually settles into the right layout.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'jsdom (and happy-dom) simulate the DOM API surface without a real rendering/layout engine. Geometry, focus order, and computed style are exactly the class of bug Browser Mode exists for — a real browser via the Playwright or WebdriverIO provider, not a faster fake DOM.',
    },
    {
      id: 'q2',
      prompt:
        'You upgrade a suite from Vitest 4 to 5 and a previously-passing test now fails: it asserts a mock was called exactly once, but the mock was also called once in a *previous* test in the same file. What changed?',
      choices: [
        { id: 'a', text: 'Vitest 5 removed `vi.fn()` in favor of `vi.mock()`, so the mock stopped recording calls at all.' },
        {
          id: 'b',
          text: '`clearMocks` now defaults to `true` in Vitest 5, so `vi.clearAllMocks()` runs before every test automatically — the test was previously (incorrectly) passing because a leftover call count from the earlier test happened to add up right.',
        },
        { id: 'c', text: 'Test files no longer get isolated module registries in Vitest 5, so all module state now leaks between tests by default.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`clearMocks: true` is a real Vitest 5 default: mock call/result history clears before each test, though a configured implementation is not restored (that is `restoreMocks`, still off by default). A test that assumed accumulated call counts from a previous test was passing for the wrong reason before the upgrade.',
    },
    {
      id: 'q3',
      prompt:
        'You need to replace `./api.ts` with a mock inside a test file, and the factory you pass to `vi.mock` needs to reuse a `vi.fn()` you also want to assert on later in the file. A `const mockFetch = vi.fn()` declared above the `vi.mock` call throws a "Cannot access before initialization" error. Why, and what fixes it?',
      choices: [
        { id: 'a', text: 'Vitest evaluates test files bottom-to-top, so declare the const at the bottom of the file instead.' },
        {
          id: 'b',
          text: '`vi.mock` calls are hoisted above all imports (and other top-level code) in the file, so the factory runs before `mockFetch` is initialized; wrap the shared value in `vi.hoisted(() => ({ mockFetch: vi.fn() }))`, which itself hoists ahead of `vi.mock`.',
        },
        { id: 'c', text: 'This is a jsdom limitation — switch the file to the `node` environment to fix the initialization order.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Vitest hoists `vi.mock` calls to the very top of the module so the mock is active before any import — including your own — can reach the real module. That hoisting is exactly why a plain `const` above it isn\'t initialized yet when the factory runs; `vi.hoisted` exists to run its own callback before the hoisted mocks.',
    },
    {
      id: 'q4',
      prompt:
        'A component fetches a user with `fetch(\'/api/users/1\')` and renders their name. Which mocking approach best preserves confidence that the component builds the right request and handles a real error response?',
      choices: [
        { id: 'a', text: '`vi.mock(\'./userApi\', () => ({ fetchUser: vi.fn().mockResolvedValue({ name: \'Ada\' }) }))`, replacing the whole fetching module.' },
        {
          id: 'b',
          text: 'Intercept the network with something like MSW (or this course\'s `@server/*` fakes), so the component\'s real `fetch` call — URL, method, error handling — still runs and is what\'s under test.',
        },
        { id: 'c', text: 'Skip mocking entirely and let the test hit the real production API.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Mocking the module that does the fetching deletes the exact code path you want under test. Mocking at the network boundary keeps the real request-building and error-handling code running, and the same fixtures work outside Vitest too (Storybook, local dev).',
    },
    {
      id: 'q5',
      prompt:
        'A test does `vi.useFakeTimers()`, triggers a state update that fires after a `setTimeout`, and then does `await waitFor(() => expect(screen.getByText(\'done\')).toBeInTheDocument())`. The test hangs until it times out. What\'s wrong?',
      choices: [
        {
          id: 'a',
          text: '`waitFor` polls using real timers by default; under a frozen fake clock those real-timer polls never see the moment change, because nothing is advancing the fake clock. Replace the `waitFor` with `await vi.advanceTimersByTimeAsync(ms)` (and assert directly afterward), or don\'t fake timers for this assertion.',
        },
        { id: 'b', text: '`waitFor` is incompatible with jsdom entirely and only works in Browser Mode.' },
        { id: 'c', text: 'Fake timers only affect `setInterval`, not `setTimeout`, so the bug must be elsewhere in the component.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Fake timers replace the clock the code under test sees, but `waitFor`\'s own internal retry loop still runs on real time by default — with the fake clock frozen, the awaited condition never gets a chance to become true through real-time polling. Advancing the fake clock explicitly (with the async variant, so microtasks flush) is the fix.',
    },
    {
      id: 'q6',
      prompt:
        'A teammate proposes snapshotting the full rendered HTML of a frequently-edited settings page component so "any visual change gets caught." What is the strongest objection?',
      choices: [
        { id: 'a', text: 'Snapshot tests cannot run in CI, only locally, so they provide no protection at all.' },
        {
          id: 'b',
          text: 'Ordinary component markup changes on nearly every unrelated edit to a frequently-edited component, so the snapshot will fail constantly and get regenerated with `--update-snapshots` on reflex — at that point it never really gets read, and it stops catching anything real.',
        },
        { id: 'c', text: 'Vitest 5 removed snapshot testing in favor of Browser Mode\'s Trace View.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A snapshot only proves "this output changed," not "this output is wrong." On a component that changes often for legitimate reasons, the snapshot fails so routinely that updating it becomes reflexive, which defeats the point. Snapshots earn their keep on stable, tedious-to-hand-assert output, not on ordinary, frequently-edited markup.',
    },
  ],
};
