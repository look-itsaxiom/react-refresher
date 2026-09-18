The sandbox has no GitHub and no YAML library, so you'll build the two pieces a real
codegen script needs: a typed `Workflow` object, and a small hand-written YAML emitter
that turns it into text. This is a **miniature** of GitHub's YAML dialect — it handles
strings, numbers, booleans, arrays, nested maps, and multi-line `run` blocks via `|`,
nothing more (no anchors, no flow style, no comments).

## `buildFrontendWorkflow(opts)`

Given:

```ts
type BuildOptions = {
  packageManager: 'pnpm' | 'npm';
  nodeVersion: number;
  e2e?: { shards: number };
  deployPreview?: boolean;
  monorepoPaths?: string[];
};
```

return a `Workflow` object (see the exported types in the starter) with these jobs, in
this order, added only when relevant:

- **`install-and-check`** — always present. Steps: checkout (`actions/checkout@v7`, with
  `persist-credentials: false`), `pnpm/action-setup@v4` *only* when
  `packageManager: 'pnpm'`, `actions/setup-node@v7` with `node-version` and `cache` set to
  the package manager, install (`pnpm install --frozen-lockfile` or `npm ci` — never
  `npm install`), then typecheck, lint, and unit-test run steps.
- **`build`** — `needs: ['install-and-check']`. Re-checkout and re-setup (jobs don't share
  a filesystem), run the build script, then upload `dist/` as an artifact named `dist`.
- **`e2e`** — only when `opts.e2e` is set. `needs: ['build']`. A `strategy.matrix.shard`
  array of `1..opts.e2e.shards`, with `fail-fast: false`. Download the `dist` artifact
  (same name as the upload), install browsers, run the sharded test command, and upload
  trace artifacts with an `if: failure()` condition.
- **`preview`** — only when `opts.deployPreview` is true. `needs: ['build']`,
  `if: "github.event_name == 'pull_request'"`, `environment: 'preview'`. Download the
  `dist` artifact and deploy it.

Every job needs `runs-on: 'ubuntu-24.04'` and a `timeout-minutes`. At the workflow level:

- `on`: `push` to `main`, and `pull_request` — with a `paths` array when
  `opts.monorepoPaths` is given.
- `concurrency`: group `'ci-${{ github.workflow }}-${{ github.ref }}'`,
  `cancel-in-progress: true`.
- `permissions`: `{ contents: 'read' }`, plus `'pull-requests': 'write'` **only** when
  `opts.deployPreview` is true. Don't grant anything broader than that.

## `toYaml(workflow)`

Serialize the `Workflow` object to YAML text, 2 spaces per indent level. You need to
handle, recursively:

- **Scalars** — strings, numbers, and booleans. A plain string that needs no quoting
  (most of them — action refs, branch names, commands) is written bare; only quote a
  string if it's empty, starts with a YAML-special character, or could be confused with a
  boolean/number/null.
- **Arrays** — each item on its own line, prefixed with `- ` at the array's indent level.
  When an array item is itself an object (a step), the object's first key shares the `- `
  line and the rest of its keys are indented to align under it — the way step lists
  normally look:
  ```yaml
  steps:
    - name: Checkout
      uses: actions/checkout@v7
  ```
- **Nested maps** — a key whose value is an object gets its own `key:` line, then the
  object's entries indented one level deeper.
- **Multi-line strings** — a `run` value containing a `\n` should be emitted as a block
  scalar: `run: |`, then every line of the string indented one level deeper than the
  `run:` line itself. A single-line `run` value stays inline as `run: <command>`.

You do not need flow-style (`{a: 1}`) output, comments, or anchors — this emitter only
needs to round-trip the shapes this lesson's `Workflow` type can produce.
