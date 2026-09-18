import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A locator `page.getByText(\'Save\')` matches two elements on the page: a button labeled "Save" and a tooltip that also happens to contain the word "Save". Calling `.click()` on it throws a strict mode violation. What is the correct fix?',
      choices: [
        { id: 'a', text: 'Switch to `page.locator(\'.save-button\')` so it always resolves to exactly one element, regardless of what else changes on the page.' },
        { id: 'b', text: 'Narrow the query to something that actually distinguishes them, like `getByRole(\'button\', { name: \'Save\' })`, or scope it inside a container locator — the strict-mode error is telling you the query is ambiguous, not that Playwright is being overly cautious.' },
        { id: 'c', text: 'Add `.first()` so it always clicks whichever one Playwright happened to find first.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`.first()` silences the error without fixing the ambiguity — it clicks whichever element happens to render first, which can flip if the DOM order changes. A CSS class works but throws away the accessibility-first query for something that breaks the moment a class gets renamed. Making the query specific enough to be unambiguous fixes the actual problem the error is pointing at.',
    },
    {
      id: 'q2',
      prompt: 'A test calls `await page.click(\'#submit\')` immediately after `await page.goto(url)`, and it passes locally but fails intermittently in CI with "element is not visible." What is the most likely cause, and what should you check first?',
      choices: [
        { id: 'a', text: 'CI machines are just slower — add a hard `await page.waitForTimeout(2000)` after the navigation to give the page more time everywhere.' },
        { id: 'b', text: 'Playwright already retries the actionability check up to the timeout, so an intermittent failure there usually means the element genuinely never becomes visible in time on some runs — check for a loading spinner, a client-side redirect, or a slow API call gating render, and either wait on that condition explicitly or fix why it is sometimes slow.' },
        { id: 'c', text: 'Playwright\'s auto-wait only works in headed mode; add `headless: false` to the CI config.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Auto-waiting already retries for up to the configured timeout (30s by default) before failing, in both headed and headless mode. An intermittent actionability failure past that budget means something real is sometimes slow — a fixed sleep just moves the flake threshold instead of fixing it, and often still isn\'t long enough on a slower CI run.',
    },
    {
      id: 'q3',
      prompt: 'Your team\'s e2e suite logs into the app through the UI at the start of every single test. What should you change, and why?',
      choices: [
        { id: 'a', text: 'Nothing — logging in through the real UI on every test is the only way to be sure login itself still works.' },
        { id: 'b', text: 'Log in once in a worker-scoped fixture, save `storageState`, and load that into each test\'s context — then write one or two dedicated tests that still exercise the login UI itself.' },
        { id: 'c', text: 'Replace the UI login with a `page.route` mock that fakes a successful auth response for every test.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Repeating a real UI login in every test multiplies the slowest, most fragile part of the suite by the number of tests. `storageState` reuse keeps a small number of tests actually verifying login while letting everything else start already authenticated — mocking auth entirely would stop testing that real login works at all.',
    },
    {
      id: 'q4',
      prompt: 'A checkout e2e test currently adds three items to the cart by clicking through the product list UI before it even starts testing the checkout flow. What is the argument for changing that setup?',
      choices: [
        { id: 'a', text: 'None — using the real UI for setup is always more realistic and should be preferred everywhere.' },
        { id: 'b', text: 'Seeding the cart via an API call (or a fixture) is faster and only fails when cart-seeding itself is broken; clicking through the product UI as setup means a checkout test can fail for reasons that have nothing to do with checkout, and takes longer on every single run.' },
        { id: 'c', text: 'Clicking through the UI is fine for setup as long as `test.step()` groups it separately in the trace.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The UI path is the right choice for the test whose subject *is* that UI flow. Using it as incidental setup for a different test bloats runtime and couples an unrelated test\'s pass/fail to code it isn\'t meant to be verifying — exactly the argument for seeding test data directly.',
    },
    {
      id: 'q5',
      prompt: 'CI runs the e2e suite against `localhost` after starting the app in a container. A teammate suggests running it against the PR\'s preview deploy URL instead. What does that change actually buy you?',
      choices: [
        { id: 'a', text: 'Nothing meaningful — the code is the same either way, so the results should be identical.' },
        { id: 'b', text: 'It catches an entire class of bug a local container can\'t: wrong build-time environment variables, a CDN serving a stale asset, an edge function misconfigured for that region — things that only exist once the app is actually built and deployed the way production will be.' },
        { id: 'c', text: 'It mainly makes the suite faster, since preview deploys are pre-warmed.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A local container runs your source in a dev-like harness; a preview deploy runs the actual production build artifact on the actual hosting infrastructure. That gap is exactly where build-time config and deployment-specific bugs live, and it\'s invisible to a suite that only ever runs against localhost.',
    },
    {
      id: 'q6',
      prompt: 'A Playwright test failed once in CI last week and hasn\'t failed since. Someone suggests adding `retries: 3` to the project config and moving on. What\'s the better first step?',
      choices: [
        { id: 'a', text: 'Add the retries — three attempts practically guarantees a real bug would still show up as failing, so this loses no safety.' },
        { id: 'b', text: 'Open the trace from that failed run first. A single unexplained failure might be a real, intermittent bug (a race, unmocked network, a genuine timing issue) that retries would paper over indefinitely rather than fix — retries absorb genuine one-off infra noise, they aren\'t a substitute for reading the one piece of evidence you have.' },
        { id: 'c', text: 'Delete the test — a test that fails even once without an obvious cause isn\'t trustworthy.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The trace viewer exists precisely so "it failed once and I don\'t know why" has an answer besides guessing. Turning on retries before looking converts an unknown flake into a permanently silenced one, which is worse than the original failure because now nothing will ever surface it again.',
    },
  ],
};
