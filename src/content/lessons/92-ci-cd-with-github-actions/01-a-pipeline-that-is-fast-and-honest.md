# A frontend CI pipeline that is fast and honest

You already know what a CI pipeline is supposed to do. The interesting design work for a
frontend repo in September 2026 is making one that's fast enough that nobody routes
around it, and honest enough that a green check actually means the branch is safe to
merge. Most teams get one of those two and lose the other: a five-minute pipeline that
skips e2e tests on every PR, or a rigorous forty-minute one that developers `--no-verify`
past locally because waiting for it kills their flow.

## Anatomy of a workflow

A GitHub Actions workflow is a YAML file under `.github/workflows/`. Four top-level
pieces matter for design, not just syntax:

- **`on`** — what triggers a run. `push` and `pull_request` are the two you'll use for
  every-commit CI. `workflow_dispatch` adds a manual "Run workflow" button — useful for a
  deploy you want to gate on a human click. `schedule` runs on a cron (UTC only, and GitHub
  may delay a scheduled run under load, so don't rely on the minute being exact).
  `merge_group` is newer and specific to **merge queues**: when a repo has a merge queue
  enabled, GitHub creates a temporary merge commit per queued PR and fires `merge_group`
  instead of `pull_request` for the check that gates the queue.
- **`permissions`** — the default `GITHUB_TOKEN` scope for every job, unless a job
  overrides it. The default for a repo depends on an org setting, but you should never
  rely on that default. State it: `permissions: { contents: read }` at the workflow level
  is the right baseline for a CI job that only checks out code and runs tests. Add
  `pull-requests: write` only on the one job that actually posts a PR comment (a preview
  deploy URL, a coverage summary). `id-token: write` is a separate grant, for OIDC — more
  on that later.
- **`concurrency`** — without it, pushing three commits to a PR in two minutes queues
  three full pipeline runs. A concurrency group keyed on the ref cancels the stale ones:
  ```yaml
  concurrency:
    group: ci-${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true
  ```
  Be careful applying `cancel-in-progress` to a `push`-to-`main` deploy workflow — you
  usually don't want a deploy cancelled mid-flight by the next merge; scope concurrency
  per-branch or per-environment so PR runs cancel each other but main-branch deploys queue
  instead.
- **`jobs`** — each job gets its own fresh runner VM and, by default, runs in parallel
  with every other job. `needs: [other-job]` creates a dependency edge and an implicit
  wait; a chain of `needs` is how you express "don't build if the lint job failed" without
  cramming everything into one job.

## The canonical shape: install once, fan out

The pipeline that scales from a five-file toy app to a monorepo has the same shape:

```
install-and-check (checkout, install, typecheck, lint, unit test)
        │
        ▼
      build (produce dist/, upload as an artifact)
        │
   ┌────┴────┐
   ▼         ▼
  e2e     preview-deploy
(sharded)  (needs: build)
```

`install-and-check` runs once. `build` depends on it via `needs` and re-checks out the
repo (jobs don't share a filesystem — each runs on its own runner). Anything downstream
that needs the build output — e2e tests against a built app, a preview deploy — depends on
`build` and downloads its **artifact** rather than rebuilding: `actions/upload-artifact`
in the `build` job, `actions/download-artifact` in the consumer, matched by `name`. As of
2026 both are on major version 7 after last year's move to unzipped direct uploads for
single files; check the current major before pinning, the way you'd check for
`actions/checkout` below.

Each job needs `runs-on` and should have `timeout-minutes`. Without a timeout, a hung
process (a dev server that never becomes ready, a test that deadlocks) burns a runner for
the default 6-hour job cap before anyone notices — and on a private repo, or a larger
runner, that's not free. Prefer a specific runner image (`ubuntu-24.04`) over the
`ubuntu-latest` alias: `-latest` is a moving target that GitHub repoints on its own
schedule, and a workflow that silently starts running on a new Ubuntu image is a workflow
that can silently break. GitHub also offers larger runners (more CPU/RAM, billed
accordingly) and Actions-hosted ARM runners for teams that need either.

## Caching: three different layers

"Cache the dependencies" undersells how many caching layers a frontend pipeline has:

1. **Package manager store.** `actions/setup-node@v7` (major version current as of this
   writing — verify before pinning) takes a `cache: 'pnpm' | 'npm' | 'yarn'` input and
   handles the `actions/cache` key/restore-key dance for you, keyed on the lockfile hash.
   For pnpm specifically, run `pnpm/action-setup` *before* `setup-node` so the cache input
   can find the pnpm store; a repo with a `packageManager` field in `package.json` can let
   Corepack pin the exact pnpm version instead of hardcoding it in the workflow.
2. **Install with a frozen lockfile.** `npm ci` or `pnpm install --frozen-lockfile` — never
   `npm install` in CI, for the same reproducibility reason [[68-supply-chain-security]]
   covers for local installs: a floating install can silently pick up a newer transitive
   dependency than the one every other CI run and every teammate's machine used.
3. **Build and type caches.** Vite and `tsc --build` both support incremental caches
   (`.vite`, `tsconfig.tsbuildinfo`); a monorepo running Turborepo or Nx benefits far more
   from a **remote cache** (Turborepo remote cache, Nx Cloud) than from `actions/cache`,
   because a remote cache can skip re-running a task entirely when nothing it depends on
   changed — not just skip re-downloading dependencies.

## Matrices, path filters, and reusable workflows

A **matrix** runs one job definition once per combination of inputs — most commonly e2e
shards (`strategy.matrix.shard: [1, 2, 3, 4]`, each shard running
`--shard=${{ matrix.shard }}/${{ strategy.job-total }}`) or a Node-version compatibility
grid. Set `fail-fast: false` on a sharded test matrix specifically: the default
(`fail-fast: true`) cancels every other shard the instant one fails, which is exactly
backwards when you want to see *all* the failures from one run, not just the first.

In a monorepo, most PRs touch one package. `paths`/`paths-ignore` on the `pull_request`
trigger skip the whole workflow when nothing under the matched paths changed; the
community action `dorny/paths-filter` does the same thing per-job, when one workflow
needs to run some jobs but not others based on which packages changed.

A **reusable workflow** (`on: workflow_call`) is a workflow file another workflow invokes
with `uses: ./.github/workflows/ci.yml` plus `with:`/`secrets:` — the way to share one
pipeline definition across several repos or several trigger workflows in a monorepo,
analogous to a composite action but at the job level instead of the step level.

## Making failures legible

`GITHUB_STEP_SUMMARY` is an env var pointing at a file; anything you append to it (Markdown)
renders in the run's summary page — use it for a coverage delta or a shard-by-shard e2e
result table instead of making someone scroll raw logs. ESLint's and `tsc`'s output can be
turned into inline PR annotations (either via `--format` flags that some ESLint
GitHub-Actions reporters consume, or a dedicated annotation action) so a lint error shows
up on the diff line, not just in a log tab.

## Further reading

- [GitHub Docs — Workflow syntax for GitHub Actions](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Docs — Using concurrency](https://docs.github.com/actions/using-jobs/using-concurrency)
- [GitHub Docs — Caching dependencies](https://docs.github.com/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [GitHub Docs — Reusing workflows](https://docs.github.com/actions/sharing-automations/reusing-workflows)
