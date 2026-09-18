import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A bug report says a reducer produces the wrong total when a coupon percentage is applied to a cart with three items. Where should the test that catches this regression live?',
      choices: [
        {
          id: 'a',
          text: 'A Playwright end-to-end test that adds three items and a coupon through the real UI in a real browser.',
        },
        {
          id: 'b',
          text: 'A unit test that calls the totals-calculating function directly with the exact state that reproduces the bug.',
        },
        { id: 'c', text: 'A visual regression snapshot comparing the cart page before and after the fix.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The bug is in a pure calculation, not in rendering or navigation. A unit test that calls the function with the reproducing input is faster to write, faster to run, and points directly at the broken line — an e2e test would also catch it, eventually, but at far higher cost per run and per diagnosis.',
    },
    {
      id: 'q2',
      prompt: 'When is a snapshot test the right tool, versus a smell that the test isn’t asserting anything real?',
      choices: [
        {
          id: 'a',
          text: 'Always — snapshots are strictly more thorough than a hand-written assertion because they capture everything.',
        },
        {
          id: 'b',
          text: 'When the output is tedious to hand-assert and rarely changes on purpose, like a generated class list or serialized structure; a snapshot of ordinary UI markup that changes on every unrelated edit is noise, rubber-stamped away with --update-snapshots.',
        },
        { id: 'c', text: 'Never — snapshot testing is deprecated in favor of visual regression tools.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A snapshot only proves something changed, not that the change is correct. It earns its keep for stable, tedious-to-assert output; for ordinary component markup it tends to fail on every unrelated change and get updated reflexively, which stops it from catching anything.',
    },
    {
      id: 'q3',
      prompt: 'Why prefer mocking the network with something like MSW over `vi.mock(\'./api\')` for a component that fetches data?',
      choices: [
        {
          id: 'a',
          text: 'vi.mock is slower to set up, so MSW is only preferred for performance reasons.',
        },
        {
          id: 'b',
          text: 'A module mock replaces your fetching code entirely, so the test stops exercising whether that code calls the right URL, method, and error handling; intercepting at the network layer keeps the real request path under test and the same handlers work in dev and Storybook too.',
        },
        { id: 'c', text: 'vi.mock cannot be used in Vitest at all; it is a Jest-only API.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Mocking the module under test removes exactly the code you meant to verify. Mocking the network preserves the real fetch call, URL, and error path, and the fixtures are reusable outside the test runner.',
    },
    {
      id: 'q4',
      prompt: 'A component reads `Math.random()` directly to generate a discount code. What is the most direct fix for testability, and why not just mock the global?',
      choices: [
        {
          id: 'a',
          text: 'Accept a `random: () => number` prop defaulting to `Math.random`; global mocking (`vi.spyOn(Math, \'random\')`) works too but couples every test to a specific global and leaks between tests that forget to restore it.',
        },
        { id: 'b', text: 'Nothing — Math.random() is deterministic enough for testing purposes.' },
        { id: 'c', text: 'Rewrite the component to avoid randomness entirely, since randomness can never be tested.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Dependency injection via a default parameter costs nothing in production and gives a test full control without touching global state. Spying on a global works but is easy to forget to restore, and it makes the non-determinism implicit rather than visible in the component’s own signature.',
    },
    {
      id: 'q5',
      prompt: 'Why does this course avoid `data-testid` as the default query strategy in checks, reaching for `getByRole`/`getByLabelText` instead?',
      choices: [
        {
          id: 'a',
          text: 'data-testid attributes are invalid HTML and get stripped by React in production builds.',
        },
        {
          id: 'b',
          text: 'A component only queryable by test id usually has no accessible name, semantic element, or keyboard path either — the query mirrors what a real user (including one using assistive technology) can actually perceive, so a passing test says something about usability, not just markup.',
        },
        { id: 'c', text: 'getByRole runs faster than getByTestId in every testing framework.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Role- and label-based queries are a proxy for accessibility. A component that fails a getByRole query in a test very often fails for a screen reader user too — the test id hides that signal instead of catching it.',
    },
    {
      id: 'q6',
      prompt: 'A teammate used an AI assistant to generate a full test file for a new feature, and every test passes on the first try. What should you check before approving the PR?',
      choices: [
        {
          id: 'a',
          text: 'Nothing extra — passing tests written by AI are held to the same bar as passing tests written by a human, so a pass is a pass.',
        },
        {
          id: 'b',
          text: 'Whether the tests would actually fail if the feature were broken: break the implementation on purpose (or check the assertions are specific and behavior-based) and confirm at least one test catches it, the same mutation-testing instinct you’d apply to any new test suite, applied more since generated tests are often plausible-looking but assertion-free.',
        },
        { id: 'c', text: 'Whether the file has enough tests to push coverage above 90%, regardless of what they assert.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A test suite that passes by construction (because it never really checks anything) is worse than no suite, because it looks like coverage. The check that matters is whether the tests fail when the code is actually wrong — verify that directly rather than trusting a green run.',
    },
  ],
};
