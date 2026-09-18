A pull request touched the lockfile. Before approving it, you want a script to
summarize exactly what moved, and a second script to close the GitHub Actions
SHA-pinning gap from the first concept step.

## `reviewDependencyDiff(before, after, metadata, recentDays)`

```ts
type Snapshot = Record<string, string>; // package name -> version

type PackageMetadata = {
  hasInstallScript?: boolean;   // true if the NEW version defines an install script
  maintainerChanged?: boolean; // true if the publishing maintainer differs from before
  publishedDaysAgo?: number;   // how many days ago the NEW version was published
};

type DiffFinding = {
  name: string;
  kind: 'added' | 'removed' | 'upgraded' | 'major-bump' | 'new-install-script' | 'maintainer-changed' | 'recently-published';
};

function reviewDependencyDiff(
  before: Snapshot,
  after: Snapshot,
  metadata: Record<string, PackageMetadata>,
  recentDays: number,
): DiffFinding[]
```

Versions in this exercise are always plain `major.minor.patch` — reuse the idea from
[[35-package-managers]] (no need to reimplement full semver, a version's major is just
the text before the first `.`).

A package name is **touched** if it's new in `after` (not in `before`) or its version
changed between `before` and `after`. Only touched names can produce findings beyond
`'removed'`.

For every name in `before` that's missing from `after`, push one `{ name, kind:
'removed' }` — regardless of metadata.

For every **touched** name:

- If it's not in `before` at all: push `{ name, kind: 'added' }`.
- Else (it changed version): push `{ name, kind: 'upgraded' }`. If the major version
  component increased, **also** push a second, separate `{ name, kind: 'major-bump' }`
  finding.
- If `metadata[name]?.hasInstallScript` is `true`: push `{ name, kind:
  'new-install-script' }`.
- If `metadata[name]?.maintainerChanged` is `true`: push `{ name, kind:
  'maintainer-changed' }`.
- If `metadata[name]?.publishedDaysAgo` is defined and less than `recentDays`: push
  `{ name, kind: 'recently-published' }`.

Untouched names (same version in both, or absent from both) never produce a finding,
even if `metadata` has an entry for them.

## `pinActions(workflowYamlLines, tagToSha)`

```ts
function pinActions(workflowYamlLines: string[], tagToSha: Record<string, string>): string[]
```

Each line is one line of a GitHub Actions workflow file. A line that references an
action looks like:

```yaml
      uses: actions/checkout@v4
```

`tagToSha` maps a `"owner/repo@tag"` key (e.g. `"actions/checkout@v4"`) to the full
40-character commit SHA it currently resolves to.

For each line:

- If it isn't a `uses:` line referencing `owner/repo@something`, return it unchanged.
- If the ref after `@` is **already** a 40-character SHA (only hex digits), return the
  line unchanged — it's already pinned.
- Otherwise, look up `"owner/repo@tag"` in `tagToSha`. If found, rewrite the line to the
  same leading whitespace and `uses: owner/repo@<sha> # <tag>`, keeping the tag as a
  trailing comment. If the tag isn't in `tagToSha`, leave the line unchanged (there's
  nothing to pin it to).

Return a new array in the same order; don't mutate the input.
