## Humans in the loop, by design

Every check in the last lesson step — mutation score, characterization tests, an axe
run — exists because "the AI said it works" is not evidence. This step is about the
structure that makes that non-negotiable: what AI code review tools actually catch, who
is accountable when something merges anyway, and the guardrails that make "verify then
trust" the default instead of a virtue you have to remember to practice.

### What AI code review catches, and what it doesn't

Tools like GitHub Copilot's PR review, CodeRabbit, Graphite's reviewer, and Cursor's
Bugbot (each still evolving quickly, so treat specifics as directional) are genuinely
good at a specific band of problems: style and lint-adjacent issues, obvious logic bugs
(a comparison that should be `>=`, a loop bound off by one), missing null/undefined
checks, and — GitHub's Copilot Autofix specifically — proposing fixes for CodeQL security
alerts with a suggested diff attached. That's real, useful coverage, and it's coverage a
human reviewer often *also* catches, just slower.

What these tools consistently miss is anything that requires knowing what the product is
supposed to do: whether a change satisfies the actual ticket, whether an architectural
choice will paint the team into a corner six months out, and subtle async bugs — a race
between two effects, a stale closure over state, a missing cleanup function — that only
look wrong once you trace the timeline of when things run, not just what the code says
in isolation. An AI reviewer reads the diff. It doesn't know the incident from eight
months ago that's the actual reason this code is careful about retry ordering.

The practical conclusion isn't "don't use AI review" — it's "AI review and human review
aren't substitutes for each other, they're stacked." Let the automated pass catch the
mechanical stuff before a human's attention gets spent on it, and keep the human pass for
everything the tool structurally can't see. Lesson 99's review rubric is the shape that
human pass should take.

### The evidence bar

The single habit that separates a team that trusts AI output safely from one that
doesn't: an agent claiming "the tests pass" is worth nothing on its own. The agent
showing the actual command it ran and the actual output — a pasted test run, a
typecheck's exit code, a screenshot of the rendered page — is worth something, because
now a human can look at the same evidence the agent looked at and disagree if it's wrong.
This project's own authoring pipeline (below) is built around exactly that rule: nothing
is "done" without a command output to point at.

Review depth should scale with **blast radius**, not with how the change was produced. A
copy-edit to a marketing string and a change to the payment retry logic both might have
been written by an agent in thirty seconds; they do not deserve the same review. The
questions that set blast radius are the same ones lesson 93 uses for flag rollouts: how
many users does this touch, is it reversible, does it touch money or auth or PII, and
what's the cost if it's wrong for a day before anyone notices.

### Guardrails as mechanism, not policy

"Review carefully" is a policy. It relies on someone remembering to apply it every time,
under deadline pressure, on the fortieth PR of the week. A guardrail is a mechanism: it
runs whether anyone remembers or not.

- **Hooks** — a pre-commit or pre-push hook that runs lint and the affected test files
  before code leaves a machine at all (Claude Code's own hook system, for agent-driven
  workflows, can gate a tool call the same way — refusing to let an agent report success
  without a green test run first).
- **Required CI checks** — typecheck, test suite, and lint configured as required status
  checks, so a PR structurally cannot merge red, regardless of who or what opened it.
- **Mutation score thresholds** — Stryker can fail a build below a configured score,
  which is a guardrail specifically against the "green tests, tests that don't test
  anything" failure mode from the last lesson step.
- **Bundle size and a11y CI gates** — a size-limit check on the built bundle, and an axe
  run wired into CI rather than left as a manual step, so a regression in either shows up
  as a failed check, not a later Lighthouse score nobody was watching.

The common shape: each of these turns a judgment call ("does this feel okay to merge")
into a mechanical yes/no that doesn't depend on anyone's attention that day.

### Metrics, and Goodhart's law

Worth tracking, loosely and directionally rather than as a dashboard to optimize per
sprint: defect escape rate (bugs found in production vs. before merge), change failure
rate (the DORA metric — what fraction of deploys need a rollback or hotfix), review time,
test flake rate, mutation score trend, and accessibility violations trend in CI. Each one
is a genuinely useful signal on its own.

The trap is Goodhart's law: any metric that becomes a target stops being a good measure.
A mutation-score floor that's *enforced* as a hard gate will, over time, get gamed by
whatever's cheapest to satisfy — assertions added for their own sake, not because they
encode real behavior — the same failure mode the metric was introduced to catch, one
level up. The fix isn't to drop the metrics; it's to keep them as inputs to a human
conversation about trend ("mutation score dropped 15 points this sprint, why") rather
than as the sole automated pass/fail gate on every PR.

### This course's own loop, as a worked example

This project practices what this lesson is arguing for on itself. Every lesson —
including this one — is authored against a written brief, then run through a verify
step: `pnpm typecheck` and `pnpm test`, specifically `src/content/__tests__/solutions.test.ts`,
which enforces two things mechanically for every exercise in the whole curriculum: the
**solution** must pass every one of that exercise's checks, and the **starter** must
*fail* at least one. That second rule exists specifically to catch a tautological check —
one that would pass against broken starter code too, the exact "no-assertion" or
"tautology" smell from the last step, just relocated from a test file to a lesson's
grading code. A check that can't tell a solution from a starter is exactly as useless as
a test that can't tell a bug from a fix.

The authoring runbook allows exactly one fix round on a red run before a lesson is
quarantined rather than shipped half-working — a concrete, enforced version of "verify
then trust," applied to the AI-authored content pipeline that produced this very lesson.
And unverified factual claims made while writing a lesson get logged in an authoring log
for a later human fact-check pass, rather than either being asserted with false
confidence or silently dropped. That log is the humans-in-the-loop mechanism for exactly
the kind of claim this concept step just made about axe's coverage ceiling or Stryker's
equivalent-mutant handling — hedge what you can't verify, and make the gap visible to a
human instead of hiding it.

### Team norms

None of the mechanisms above matter without an ownership rule underneath them: a named
human is accountable for every merged line, whether an agent, a human, or both wrote it.
Disclosure — a PR description that says which parts were AI-generated and which prompts
or specs drove them — isn't bureaucracy, it's what lets the next reviewer (including
future-you) calibrate how hard to look. And the skills that stay valuable regardless of
how good the tools get are the ones an agent can't substitute for on its own: writing a
precise spec, reviewing a diff for intent rather than just syntax, debugging by forming
and testing a hypothesis, thinking about a system's failure modes, accessibility
judgment, and performance intuition. The tools change every few months. What you're
being asked to get good at underneath them doesn't.

### Where to go from here

This is the last lesson in the curriculum, not the last thing to learn. The fastest way
to keep pace with a field that moves this quickly is the same evidence-first habit this
lesson has been arguing for: don't take a tool's marketing at face value, check its
release notes and changelog against what you actually need. A short, durable set of
places to keep returning to:

- **React's own channel** — the [React Labs blog](https://react.dev/blog) for what's
  shipping and why, and the [React docs](https://react.dev/) themselves, which get
  revised as APIs mature.
- **A map of the wider ecosystem** — [roadmap.sh's frontend
  roadmap](https://roadmap.sh/frontend) for what's considered current across the parts of
  this field that move independently of React (bundlers, CSS, testing, deployment).
- **The tracks in this curriculum** — each one (rendering, performance, accessibility,
  testing, security, and the rest) is a lens you can re-apply to whatever framework or
  tool you're using next; the specific APIs in this course will age, the questions each
  track teaches you to ask won't.

Treat "is this still true" as a standing question, not a one-time audit — exactly the
habit the rest of this lesson has been describing for AI-generated code, pointed back at
your own knowledge.

### Further reading (optional)

- [GitHub: about Copilot code review](https://docs.github.com/en/copilot/using-github-copilot/code-review/using-copilot-code-review)
- [GitHub: Copilot Autofix for CodeQL](https://github.blog/2024-09-16-secure-code-faster-generally-available-github-copilot-autofix/)
- [DORA: the four key metrics](https://dora.dev/guides/dora-metrics-four-keys/)
- [roadmap.sh: Frontend Roadmap](https://roadmap.sh/frontend)
