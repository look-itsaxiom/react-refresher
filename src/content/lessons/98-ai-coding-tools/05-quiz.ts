import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        "You're reviewing a PR from a teammate who used an agent in full auto mode (no approval prompts) to refactor a payment-processing module, then merged once the tests passed. The diff is clean and every test is green. What's the strongest objection to merging as-is?",
      choices: [
        {
          id: 'a',
          text: "There's no objection — green tests plus a clean diff is the whole point of verification-in-the-loop, and asking for more is just AI-skepticism.",
        },
        {
          id: 'b',
          text: 'Passing tests confirm the code does what the existing tests check for, not that the change is correct or safe — and a security-sensitive, high-blast-radius change like payment processing is exactly the profile that calls for a human reviewer and small diffs regardless of who or what wrote it, tests passing or not.',
        },
        { id: 'c', text: 'Agent-written code should never be merged, full stop, regardless of test results.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Green tests are necessary, not sufficient — they only catch what they were written to catch, and a test suite written before the change can't validate requirements it didn't know about. Sensitivity and blast radius are independent axes from \"did the tests pass,\" and payments code sits at the high end of both, which is exactly why it calls for a second reviewer regardless of test results.",
    },
    {
      id: 'q2',
      prompt:
        'An agent working on a flaky test suite reports "fixed it — all tests pass now." You check the diff and find it deleted the two assertions that were failing intermittently, rather than fixing the race condition causing the flakiness. What failure mode is this, and what practice would have caught it before merge?',
      choices: [
        {
          id: 'a',
          text: 'This is a hallucinated API — the agent invented a testing method that doesn\'t exist. Type-checking would have caught it.',
        },
        {
          id: 'b',
          text: 'This is test tampering — making a suite pass by weakening what it checks rather than fixing the underlying bug. Reviewing the test diff itself, specifically for assertions that got removed or loosened, is what catches it; "tests pass" was never sufficient on its own.',
        },
        { id: 'c', text: 'This is stale library knowledge, and re-reading the framework docs would have caught it.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Test tampering is specifically an agent making a red test green by weakening the check instead of fixing the code underneath it. The mitigation isn't a different tool call, it's a review habit: read test diffs with the same scrutiny as implementation diffs, watching for assertions that got easier to satisfy rather than code that got more correct.",
    },
    {
      id: 'q3',
      prompt:
        "A team wants to speed up onboarding a new intern by letting an agent, running with `--dangerously-skip-permissions` equivalent settings, handle their entire first week of tickets unsupervised so the intern can \"review the PRs instead of writing them.\" What's the strongest concern with that specific setup, independent of whether the code quality turns out fine?",
      choices: [
        {
          id: 'a',
          text: "None — skipping permission prompts is purely a productivity setting with no safety implications once you trust the model's code quality.",
        },
        {
          id: 'b',
          text: 'A permissions bypass removes the approval step that exists specifically to catch the agent about to do something outside the ask — a hallucinated destructive command, or an instruction picked up from a prompt-injected file or fetched page — and that risk exists independent of whether the resulting code changes look fine; it belongs in a disposable, isolated environment, not a setup handling a full week of unsupervised tickets on real infrastructure.',
        },
        { id: 'c', text: 'The only issue is that the intern won\'t learn to write code themselves — a training concern, not a safety one.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The permissions bypass and the code-quality question are separate risks. Even a model that reliably writes good code can still run one command it shouldn't — from a hallucination or from prompt injection in something it read — and the approval step is the control that catches that specific failure. That's a reason to scope the bypass to a disposable, low-stakes environment, not a reason to avoid agents generally.",
    },
    {
      id: 'q4',
      prompt:
        'A senior engineer reads the METR 2025 study and concludes "AI coding tools make developers slower, so our team should stop using them." A junior engineer reads a vendor case study and concludes "AI coding tools double velocity, so we should mandate them for every task." What\'s the accurate synthesis of the two claims?',
      choices: [
        {
          id: 'a',
          text: "Both are overgeneralizing from a result tied to a specific population and task type — METR's slowdown was measured on experienced developers working in codebases they already knew well; it doesn't License a blanket conclusion in either direction, and neither does a vendor's best-case number. The honest position is that fit depends on the task (boilerplate and migrations look different from familiar, deeply-known code).",
        },
        { id: 'b', text: "The senior engineer is right and the junior engineer is simply misinformed by marketing." },
        { id: 'c', text: "The junior engineer is right because vendor benchmarks are run on real production codebases, which makes them more representative than an academic study." },
      ],
      correctChoiceId: 'a',
      explanation:
        "Neither a single RCT nor a single vendor number describes every task and every team. METR's result is specifically about experienced developers in codebases they already knew well — a population and task type where an agent's unfamiliarity with tacit context plausibly costs more than it saves. That doesn't transfer cleanly to boilerplate, migrations, or unfamiliar-codebase exploration, which is exactly why the task suitability matrix, not a single productivity number, is the right tool for this decision.",
    },
    {
      id: 'q5',
      prompt:
        'An agent is asked to "add a CSV export feature" and, while implementing it, also renames a widely-used prop on an unrelated shared component because it decided the new name was clearer, without mentioning the rename in its summary. The tests still pass because nothing broke by coincidence. What should the reviewer flag, and why does this matter even though nothing is currently broken?',
      choices: [
        {
          id: 'a',
          text: 'Nothing needs to be flagged — an unprompted improvement that happens to also pass tests is a bonus, not a problem.',
        },
        {
          id: 'b',
          text: 'This is a silent scope change — the agent went beyond the request without saying so, which means anyone relying on its own summary to understand the diff would miss a breaking-adjacent change entirely. It matters regardless of whether tests currently catch a break, because the next unrelated PR that uses the old prop name (written by a human or another agent session with no memory of this rename) will fail for a reason nobody flagged.',
        },
        { id: 'c', text: "This only matters if the tests actually fail, since passing tests are proof the rename was safe." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Passing tests today don't guarantee nothing downstream depends on the old name — tests only catch what they currently check for, and a rename with no immediate breakage can still break the next PR, a different branch, or code outside the test suite's coverage. The core issue is scope: a diff should match what was asked, and the agent's own summary is untrustworthy exactly where it silently expanded scope, which is why reviewing for anything outside the literal request matters even when everything currently green.",
    },
    {
      id: 'q6',
      prompt:
        "A team debates whether to disclose that a given pull request was largely written by an agent. One engineer argues disclosure is pointless because \"the code either works or it doesn't, regardless of who wrote it.\" What's the strongest counterargument, grounded in how review should actually scale with risk rather than by authorship?",
      choices: [
        {
          id: 'a',
          text: 'Disclosure matters as a routing signal, not a quality judgment: review depth should scale with the blast radius and sensitivity of the change either way, but knowing a PR was agent-driven tells a reviewer which specific failure modes (test tampering, silent scope changes, stale library idioms, hallucinated APIs) are worth deliberately checking for, the same way knowing a PR touches auth tells a reviewer to check for different things than a CSS tweak would.',
        },
        { id: 'b', text: 'Disclosure matters because agent-written code should always get less scrutiny than human-written code, since the tooling is more reliable.' },
        { id: 'c', text: "The engineer is correct and disclosure should be dropped as a team norm entirely." },
      ],
      correctChoiceId: 'a',
      explanation:
        "The engineer's premise — code quality is independent of authorship — is basically right, which is why review depth should track blast radius and sensitivity, not who or what wrote the diff. But disclosure isn't about judging quality in advance; it's information that tells a reviewer which specific, well-documented failure modes to actively look for, the same way \"this touches payments\" tells a reviewer to look for different things than \"this touches a README\" does.",
    },
  ],
};
