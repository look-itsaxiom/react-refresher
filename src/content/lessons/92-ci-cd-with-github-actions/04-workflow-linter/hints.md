Start by looping `Object.entries(workflow.jobs)` once, and inside that loop check the
job-level rules (`missing-permissions`, `missing-timeout`, `floating-runner`) before
looping that job's `steps` for the step-level rules (`unpinned-action`,
`script-injection`, and the checkout half of `untrusted-checkout`).
---
For `untrusted-checkout`, first check whether the *workflow* trigger includes
`pull_request_target` — `'pull_request_target' in workflow.on` — before looking at any
step; there's no point scanning steps in a workflow that doesn't use that trigger at all.
Then, within a job's steps, find one where `uses` includes `'actions/checkout'` and
`step.with?.ref` is a string matching
`/github\.event\.pull_request\.head\.(sha|ref)/`.
---
For `unpinned-action`, a helper is worth writing:
`function isPinned(uses: string) { return /@[0-9a-f]{40}$/.test(uses); }`. Skip the rule
entirely when `uses` starts with `'./'` or `'docker://'` before calling it.
---
For `script-injection`, a step only has this problem if its `run` field is set — steps
that use `uses` instead of `run` can't have shell injection this way. Test
`/\$\{\{\s*github\.event\.[^}]+\}\}/` against the `run` string.
---
`explainFinding` can be a single object literal keyed by `FindingCode` mapping to a
paragraph string, with a function that indexes into it — you don't need a switch
statement. Keep each paragraph to 2-4 sentences: what fires the rule, and why it's a
problem in practice (tie `untrusted-checkout` and `script-injection` back to what an
attacker actually gains).
