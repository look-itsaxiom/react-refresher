import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        "A teammate says: \"We committed the lockfile, so we're protected from a malicious dependency update.\" Is that enough on its own?",
      choices: [
        { id: 'a', text: 'Yes — once a lockfile exists, `npm install` can never pull in anything different from what it records.' },
        {
          id: 'b',
          text: "No — a committed lockfile only helps if installs actually respect it. Plain `install` will still re-resolve and rewrite it when `package.json` drifts; CI needs `npm ci` / `--frozen-lockfile` / `--immutable` to refuse anything that doesn't match exactly.",
        },
        { id: 'c', text: "No — lockfiles only record dev dependencies, not production ones." },
      ],
      correctChoiceId: 'b',
      explanation:
        "A lockfile is a record, not an enforcement mechanism by itself. The enforcement comes from running an install mode that fails instead of silently re-resolving when the lockfile and manifest disagree — that's the whole reason `npm ci` exists as a separate command from `npm install`.",
    },
    {
      id: 'q2',
      prompt:
        "Your CI pipeline runs `npm install` (not `npm ci`) and doesn't ignore install scripts. A dependency you use gets compromised via a maintainer's stolen npm credentials, and the malicious version ships a `postinstall` script that reads environment variables and posts them to an external URL. What's the most direct way this reaches your CI secrets?",
      choices: [
        {
          id: 'a',
          text: "It can't — install scripts run in a sandbox with no access to the environment.",
        },
        {
          id: 'b',
          text: "The postinstall script runs with the same OS-level privileges and environment access as the CI job itself, including any secrets exposed as env vars, the moment `install` finishes — no separate exploit is needed.",
        },
        { id: 'c', text: 'Only if the malicious package is a direct dependency, never a transitive one.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A lifecycle script isn't sandboxed from the environment it runs in by default — it's a normal script with normal process privileges, which is exactly what the 2025 Shai-Hulud worm exploited to harvest npm, GitHub, and cloud credentials during `install`. It doesn't matter whether the compromised package is a direct or transitive dependency; if it's in the tree and scripts aren't disabled or allowlisted, it runs.",
    },
    {
      id: 'q3',
      prompt:
        "Why does a minimum release age (like pnpm's `minimumReleaseAge`, defaulted to 1,440 minutes since pnpm 11) meaningfully reduce risk, when it does nothing to actually detect malicious code?",
      choices: [
        {
          id: 'a',
          text: "It doesn't help — malicious packages are equally likely to be caught on day one as on day thirty.",
        },
        {
          id: 'b',
          text: "Most malicious versions are caught and pulled from the registry within hours to a couple of days of publishing (both 2025 incidents were caught same-day or next-day); a cooldown means your install simply never sees a version during the window it was most likely to be actively malicious and undetected.",
        },
        { id: 'c', text: "It works by re-scanning every dependency's source code for known malware signatures before allowing the install." },
      ],
      correctChoiceId: 'b',
      explanation:
        "The control doesn't detect anything itself — it borrows detection time from the rest of the ecosystem. Because most supply-chain compromises get caught fast once someone notices, a short cooldown filters out the highest-risk window without meaningfully slowing down legitimate day-to-day updates.",
    },
    {
      id: 'q4',
      prompt:
        "A workflow step is written as `uses: some-org/some-action@v3`. A teammate proposes changing it to `uses: some-org/some-action@<40-char-sha> # v3`. What problem does this specifically solve that the tag alone doesn't?",
      choices: [
        { id: 'a', text: 'It makes the workflow run faster, since GitHub can skip resolving the tag.' },
        {
          id: 'b',
          text: "A tag like `v3` is a mutable pointer the action's maintainer (or an attacker who compromises that maintainer's account) can move to point at different code at any time; a commit SHA is immutable, so the workflow always runs the exact code you reviewed, regardless of what the tag points to later.",
        },
        { id: 'c', text: 'It has no real security benefit; both are equally safe as long as the action is popular.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is precisely the mechanism behind the 2025 `tj-actions/changed-files` compromise: a tag was moved to point at malicious code, and every workflow that trusted the tag ran it with the job's own secrets in scope. Pinning to a SHA removes that specific trust dependency on the tag staying honest.",
    },
    {
      id: 'q5',
      prompt:
        "Your team's internal package is `@yourco/utils`, published only to a private registry. A security reviewer asks whether you're exposed to dependency confusion. What determines the answer?",
      choices: [
        {
          id: 'a',
          text: "You're safe automatically — private registries are never reachable by public package names.",
        },
        {
          id: 'b',
          text: "It depends on whether your `.npmrc` explicitly pins the `@yourco` scope to your private registry; without that pin, a public package published under the same scoped name (by an attacker or by accident) can resolve during install instead of your real internal package.",
        },
        { id: 'c', text: "It depends only on whether the package name contains a hyphen." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Dependency confusion exploits ambiguity in registry resolution, not a technical inability to reach the public registry. An explicit scope-to-registry mapping removes the ambiguity; without it, the resolution order is a policy decision your tooling makes on your behalf, and an attacker can try to win that decision by publishing the same name publicly.",
    },
    {
      id: 'q6',
      prompt:
        "A scanner (npm audit, Socket, or similar) reports 140 vulnerabilities in your dependency tree, most of them moderate-severity issues in dev-only tooling you never ship. What's the right response?",
      choices: [
        {
          id: 'a',
          text: 'Set the CI vulnerability gate to fail on zero findings and block every merge until all 140 are gone.',
        },
        {
          id: 'b',
          text: "Triage: separate what's reachable in shipped code from what's dev-only noise, prioritize by real exploitability and severity, and fix or accept-with-reason accordingly — treating every finding as equally urgent trains the team to stop reading the report at all.",
        },
        { id: 'c', text: "Disable the scanner; a report with 140 findings is clearly miscalibrated and not worth acting on." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Scanner output is triage input, not a verdict. A team that's forced to treat 140 mostly-irrelevant findings as equally blocking will eventually stop looking at the report closely — which is exactly the condition under which the one finding that matters gets missed. Neither reflexively blocking everything nor turning the scanner off addresses that.",
    },
  ],
};
