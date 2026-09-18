This time you're grading the **object**, not text — a linter reads the same typed
`Workflow` shape from the previous exercise directly, the way a real static-analysis tool
would work against a parsed AST instead of re-parsing YAML text itself.

## `lintWorkflow(workflow)`

Return an array of `Finding` objects (empty means clean). Implement exactly these six
rules, each producing one finding per place it fires:

1. **`missing-permissions`** (`level: 'warn'`) — a job has no effective `permissions`:
   neither the workflow-level `permissions` nor that job's own `permissions` is set. (If
   the workflow sets top-level `permissions`, every job inherits it and this rule doesn't
   fire for that job, even without its own.)
2. **`untrusted-checkout`** (`level: 'error'`) — the workflow's trigger includes
   `pull_request_target`, and some step in some job `uses` an action matching
   `actions/checkout` **and** its `with.ref` interpolates
   `github.event.pull_request.head.sha` or `github.event.pull_request.head.ref`. This is
   the RCE pattern from the previous concept step: privileged trigger, untrusted code
   checked out.
3. **`script-injection`** (`level: 'error'`) — any step's `run` string contains a
   `${{ github.event.<anything> }}` interpolation. It doesn't matter which trigger the
   workflow uses; interpolating event data straight into a shell command is the bug.
4. **`unpinned-action`** (`level: 'warn'`) — a step's `uses` value is set, doesn't start
   with `./` (a local composite action) or `docker://`, and isn't pinned to a 40-character
   hex commit SHA (i.e. doesn't end in `@` followed by exactly 40 hex characters).
5. **`missing-timeout`** (`level: 'info'`) — a job has no `timeout-minutes`.
6. **`floating-runner`** (`level: 'info'`) — a job's `runs-on` ends in `-latest`
   (`ubuntu-latest`, `windows-latest`, ...).

Each `Finding` needs at least `{ code, level, jobId, message }` — `jobId` is the job the
finding applies to (use `'workflow'` for a workflow-level concern, though none of these
six rules are workflow-level in the sense of not belonging to a job). Order findings by
iterating jobs in the order they appear in `workflow.jobs`, and within a job, in roughly
rule order — the checks don't require an exact order, just that every expected finding is
present.

## `explainFinding(code)`

Given a `FindingCode`, return a one-paragraph string explaining what the finding means and
why it matters — the kind of text a PR comment bot would post next to the finding. Cover
all six codes.

The default export runs `lintWorkflow` against two fixtures: a deliberately hostile
workflow, and a clean one, and renders both finding lists.
