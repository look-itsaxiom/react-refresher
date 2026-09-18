import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A workflow triggered on `pull_request_target` needs to build and comment a preview URL on every PR, including ones from forks. A reviewer objects to the whole trigger as unsafe. What is the narrowest correct fix, rather than abandoning the feature?',
      choices: [
        { id: 'a', text: 'Switch to `pull_request` instead; it can do everything `pull_request_target` can, just with a safer name.' },
        {
          id: 'b',
          text: "Keep pull_request_target for the privileged part (commenting with a write-scoped token), but never check out the fork's PR head commit inside that job — build from the base branch, or split the untrusted build into a separate `pull_request` (or `workflow_run`-triggered) workflow that doesn't get the elevated token.",
        },
        { id: 'c', text: 'Add a CODEOWNERS-based required reviewer on the workflow file itself; that removes the risk from pull_request_target entirely.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "pull_request_target exists specifically to grant a write-scoped token/secrets even for fork PRs — pull_request cannot do that, so switching triggers loses the feature. The actual hazard is combining that elevated trust with checking out attacker-controlled code; removing just that combination (never checkout the fork's head in the privileged job) keeps the feature and closes the hole.",
    },
    {
      id: 'q2',
      prompt:
        'A `run:` step does `echo "New title: ${{ github.event.pull_request.title }}"` to log context for debugging. A security reviewer flags it even though the workflow only triggers on `pull_request` (not `pull_request_target`) and has no write permissions or secrets. Are they right to flag it?',
      choices: [
        { id: 'a', text: 'No — without elevated permissions or secrets, there is nothing for an attacker to gain by injecting shell syntax through the title.' },
        {
          id: 'b',
          text: "Yes — the injection itself doesn't need elevated permissions to be a problem: it lets an attacker run arbitrary commands on the runner (exfiltrate the plain GITHUB_TOKEN and any other secrets the job *does* have, read other steps' env, pivot within the job), even a low-privilege job is worth denying that foothold in.",
        },
        { id: 'c', text: 'No — GitHub automatically escapes github.event.* values before they reach a run: step, so this is never actually executable.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'GitHub does not escape `${{ }}` interpolations before they land in the shell script text — the expression is substituted as raw text before the shell ever runs, so attacker-controlled characters in the title become shell syntax. Even a low-privilege job is worth hardening: the fix (route it through `env:`) costs nothing, and "no secrets today" is not a guarantee about tomorrow\'s copy-pasted workflow.',
    },
    {
      id: 'q3',
      prompt:
        "A team's e2e job has `strategy.matrix.shard: [1, 2, 3, 4]` and the default `fail-fast: true`. They notice that when shard 2 fails, the run report only ever shows one failure, even on PRs they know broke multiple test files across shards. What's happening, and what's the fix?",
      choices: [
        { id: 'a', text: 'Their sharding math is wrong; --shard=N/M is being computed incorrectly, causing test files to be skipped.' },
        {
          id: 'b',
          text: 'fail-fast: true (the default) cancels every other matrix job the instant one fails, so the other shards never finish and never get to report their own failures; setting fail-fast: false lets all shards run to completion and surface everything that\'s actually broken in one run.',
        },
        { id: 'c', text: 'Playwright only reports the first failure per run regardless of matrix configuration; this is expected and not fixable via workflow config.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is exactly backwards from what you want on a test matrix: fail-fast is meant for something like a version compatibility grid, where one failure tells you enough. On sharded tests, each shard covers different test files, so cancelling the others on the first failure hides unrelated breakage. fail-fast: false is the right default for e2e shards specifically.",
    },
    {
      id: 'q4',
      prompt:
        'A repository stores an AWS access key and secret as repository secrets, used by a deploy job to push a built SPA to S3/CloudFront. A platform engineer proposes replacing this with OIDC. A developer pushes back: "the secrets already work and are scoped to a deploy-only IAM user, so what does OIDC actually buy us?" Evaluate the pushback.',
      choices: [
        { id: 'a', text: 'The pushback is correct — if the IAM user is already scoped to deploy-only actions, OIDC provides no additional security benefit.' },
        {
          id: 'b',
          text: "Scoping the IAM user's permissions is necessary but separate from the problem OIDC solves: a static key is long-lived and sits in GitHub's secret store (and in every job's environment) indefinitely, so a leak (a misconfigured log, a compromised action, a workflow bug that echoes env vars) grants standing access until someone notices and rotates it. OIDC mints a token scoped to that one job run, so a leak from a run has nothing reusable to steal.",
        },
        { id: 'c', text: 'The pushback is correct — OIDC only matters for multi-cloud deployments, not single-provider setups like this one.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'IAM scoping and credential lifetime are independent axes of risk. A well-scoped but long-lived key still leaves a durable secret sitting in the platform indefinitely; OIDC addresses the lifetime axis specifically, by having the credential exist only for the duration of one job run. The two controls are complementary, not substitutes for each other.',
    },
    {
      id: 'q5',
      prompt:
        'A monorepo CI workflow gates PR merges on a job named `test` via a required status check, using `paths: ["packages/web/**"]` on the `pull_request` trigger to skip runs for PRs that don\'t touch that package. A PR that only edits root-level tooling config sits with a permanently pending, unmergeable `test` check. What\'s going wrong?',
      choices: [
        {
          id: 'a',
          text: "A workflow that doesn't run at all for a given PR (because its path filter didn't match) never reports its required status check as passing — required checks default to pending until something posts a status, and a skipped-by-filter workflow posts nothing.",
        },
        { id: 'b', text: 'The path filter syntax is invalid; ** globs are not supported in paths, so the entire trigger is silently disabled.' },
        { id: 'c', text: 'Required status checks only work on push triggers, not pull_request triggers with path filters.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "This is the standard gotcha with combining path filters and required checks: GitHub's branch protection doesn't know the difference between \"still running\" and \"filtered out entirely\" — both look like pending. A PR outside the filtered paths never gets a status posted at all, so it can never satisfy a required check that expects one. The fix is usually a lightweight always-run job (or scoping the requirement to only apply when the path pattern matches, which newer rulesets support more directly than classic branch protection).",
    },
    {
      id: 'q6',
      prompt:
        "A team enables a GitHub merge queue for `main`, requiring PRs to pass CI in the queue before merging, on top of already requiring CI to pass before a PR can even join the queue. A developer argues this is redundant: \"we already ran CI on the PR, why run it again?\" What's the actual gap the merge queue closes?",
      choices: [
        { id: 'a', text: "There's no real gap — merge queues exist purely to serialize merges to avoid GitHub API rate limits, not to catch any test failures the PR's own CI missed." },
        {
          id: 'b',
          text: "A PR's own CI run tests it against main as it was when CI ran — not against main plus whatever else has merged (or is ahead of it in the queue) since then. Two independently-passing PRs can still conflict or break each other once both land; the merge queue re-tests each PR merged against the current queue state (firing merge_group) specifically to catch that class of failure before it reaches main.",
        },
        { id: 'c', text: 'The gap is flaky tests — merge queues exist to automatically retry failing tests up to three times before blocking a merge.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is the core reason merge queues exist: individually green PRs are not guaranteed to be green *together*. A queue re-runs CI against each PR merged on top of the current queue state (not the stale base it branched from), catching integration conflicts between unrelated PRs before either actually lands on main — a gap the PR's own CI run structurally cannot see, since it only knows about the world at the time it ran.",
    },
  ],
};
