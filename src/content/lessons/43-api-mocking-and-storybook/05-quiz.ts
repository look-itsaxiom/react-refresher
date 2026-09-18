import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A test needs the happy-path handlers from the shared handlers.ts, except for one endpoint that should return a 500 for this test only. What is the right way to do that with MSW, and why not just write a whole separate handlers array for this test?',
      choices: [
        { id: 'a', text: 'Call server.use() with the one overriding handler inside the test, then server.resetHandlers() in an afterEach; a full separate array duplicates every other handler for a one-line change.' },
        { id: 'b', text: 'Edit handlers.ts directly to return 500 for that endpoint, then edit it back after the test run.' },
        { id: 'c', text: 'Use vi.mock to replace the fetching module just for that one test.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'server.use() layers a runtime override on top of the shared defaults for exactly the handlers a test needs to change, without touching or duplicating the rest. Editing the shared file is fragile and stateful across test runs; falling back to vi.mock reintroduces the problem MSW exists to avoid.',
    },
    {
      id: 'q2',
      prompt:
        'A handler matches every request during a test run but a later assertion never sees the expected UI state. The handler resolver has a bug: it returns undefined instead of a Response for one case. What actually happens to that request?',
      choices: [
        { id: 'a', text: 'MSW throws an error immediately, because a matched handler must return a Response.' },
        { id: 'b', text: 'MSW treats it as a passthrough and keeps looking for another matching handler; if none matches, the request is unhandled per onUnhandledRequest, which is easy to misdiagnose as "the handler never matched" when the handler actually ran.' },
        { id: 'c', text: 'The request resolves with an empty 200 response automatically.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Returning undefined from a resolver is indistinguishable from an intentional passthrough() to MSW — both mean "not this handler." A resolver that accidentally falls off the end of an if/else without returning a Response produces exactly the symptom of a handler that never matched, which is why onUnhandledRequest: \'error\' is worth turning on in tests.',
    },
    {
      id: 'q3',
      prompt:
        'Why does a component test that only mocks the network (MSW) give more confidence than one that mocks the fetching module, for the same component?',
      choices: [
        { id: 'a', text: 'It doesn\'t — both approaches test exactly the same code paths, MSW is just more popular.' },
        { id: 'b', text: 'The network mock still exercises the real fetch call: the URL built, the method, headers, and how the component parses a real Response and handles a real error status — a module mock skips all of that by replacing the function that would have done it.' },
        { id: 'c', text: 'MSW mocks are faster to execute than module mocks, so "more confidence" really means "faster feedback."' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The value is in what stays real. A module mock removes the fetching code from the test entirely; a network-level mock leaves fetch, the URL construction, and response parsing all genuinely under test, and only fakes what\'s on the other side of the wire.',
    },
    {
      id: 'q4',
      prompt:
        'A story defines both a component-level decorator (wraps children in a ThemeProvider) and a story-level decorator (wraps children in a mock AuthContext for one specific story). Which one ends up on the outside when the story renders, and why does that direction matter here?',
      choices: [
        { id: 'a', text: 'The story-level decorator is outermost, since it was defined more specifically for this exact story.' },
        { id: 'b', text: 'The component-level (meta) decorator is outermost, matching Storybook\'s global-then-component-then-story nesting order — which matters here because the AuthContext mock needs to render inside the ThemeProvider, not the other way around, if the mocked auth UI reads theme values.' },
        { id: 'c', text: 'Order doesn\'t matter — React context providers work identically regardless of nesting order.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Storybook composes decorators outermost-to-innermost as global, then meta, then story — so a broader, shared concern like theming stays outside a narrower, story-specific concern like a mocked auth state. Getting this backwards would mean the more specific decorator can\'t see values the outer one provides.',
    },
    {
      id: 'q5',
      prompt:
        'A visual regression suite (Chromatic/Argos) on a component library starts failing on nearly every PR, for components nobody touched. The team\'s response has become "just click approve." What is most likely wrong, and what should be fixed first?',
      choices: [
        { id: 'a', text: 'Visual regression testing is inherently unreliable and should be replaced with more play-function interaction tests.' },
        { id: 'b', text: 'The stories likely have a source of nondeterminism baked in — live timestamps, unmocked network data, running CSS animations, or an unpinned web font — and fixing that (freeze data, disable transitions, pin fonts) is the actual bug; "just approve" is a symptom of noise, not a tooling failure.' },
        { id: 'c', text: 'The baseline snapshots are simply out of date and need a one-time mass re-approval to fix permanently.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Visual diffs are only useful if the only thing that changes between runs is an actual code change. Live data, animation, and font loading are the three most common sources of noisy diffs, and a one-time mass re-approval doesn\'t fix a suite that will immediately start failing again for the same reason.',
    },
    {
      id: 'q6',
      prompt:
        'A teammate proposes writing a component\'s interaction test once, as a story\'s play function, and reusing it as the Vitest test via composeStories, instead of hand-writing the same click-and-assert logic twice in two files. Is this a reasonable plan?',
      choices: [
        { id: 'a', text: 'It doesn\'t break down — composeStories exists specifically so a story\'s play function can be reused as the Vitest test, which is the point of portable stories, not a compromise.' },
        { id: 'b', text: 'Storybook stories cannot contain play functions at all; interaction testing requires a separate Playwright script.' },
        { id: 'c', text: 'play functions can only run inside the Storybook UI and are never executed by Vitest or CI.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'This is exactly what composeStories and the Vitest addon are for: a story with a play function is simultaneously the documented interaction, the a11y-audited example, and (composed) a real Vitest test — writing it twice would be the actual duplication. The reasoning in the question is sound; the wrong answers describe capabilities that don\'t exist.',
    },
  ],
};
