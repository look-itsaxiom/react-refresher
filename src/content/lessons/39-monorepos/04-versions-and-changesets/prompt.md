Two functions that model what happens when a monorepo actually ships a release: what a
package's `package.json` looks like once published (no more `workspace:`/`catalog:`
specifiers a registry consumer couldn't resolve), and how Changesets turns a pile of
per-PR change descriptions into a version bump per package.

## 1. `resolveWorkspaceVersions(dependencies, localVersions, catalog)`

```ts
function resolveWorkspaceVersions(
  dependencies: Record<string, string>,
  localVersions: Record<string, string>,
  catalog: Record<string, string>,
): Record<string, string>
```

Rewrite each dependency value the way pnpm rewrites a package's `dependencies` at
publish time, and return the rewritten map (same keys, new values; leave ordinary
ranges like `"^4.17.21"` untouched):

- `"workspace:*"` → the exact current version of that dependency, looked up in
  `localVersions[name]` (e.g. `"1.4.2"`, no range operator).
- `"workspace:^"` → `"^" + localVersions[name]`.
- `"workspace:~"` → `"~" + localVersions[name]`.
- `"workspace:<anything else>"` (an explicit version or range already written after the
  protocol, e.g. `"workspace:^1.2.3"` or `"workspace:1.2.3"`) → drop the `workspace:`
  prefix and keep the rest exactly as written; `localVersions` is irrelevant here since
  the range was already spelled out.
- `"catalog:"` (bare) → the value at `catalog['default']`.
- `"catalog:<name>"` → the value at `catalog[name]`.
- Anything else (a plain semver range, already resolved) → unchanged.

## 2. `bumpChangesets(changesets, graph)`

```ts
type Bump = 'patch' | 'minor' | 'major';
type Pkg = { version: string; dependencies: Record<string, string> };
type Graph = Record<string, Pkg>;

function bumpChangesets(changesets: Array<{ pkg: string; bump: Bump }>, graph: Graph): Record<string, string>
```

`graph` is the whole workspace: every package's current `version` and its
`dependencies` (a `workspace:`-prefixed value marks an internal dependency, same rule as
the last exercise). `changesets` is the list of pending changeset entries — each one
says "this package needs at least this bump." A package can appear in more than one
changeset; when it does, the **highest** bump wins (`major` > `minor` > `patch`).

Compute the bump level for every package, starting from the changesets, then apply
Changesets' `updateInternalDependencies` rule: **any package that internally depends on
a package receiving a bump must itself receive at least a `patch` bump** (its own
`package.json` changed — the dependency's version moved — even if none of its own files
did). This cascades: if that dependent's bump causes *its* dependents to need a bump too,
they get one, and so on, until nothing changes anymore.

Return a map from package name to its **new version string**, for every package that
ends up with a bump (any level) — packages untouched by the whole process should not
appear in the result. Bump a version the normal semver way: `major` increments the major
and zeroes minor/patch; `minor` increments minor and zeroes patch; `patch` increments
patch only.

Ship a tiny default `App` that runs both functions on the fixtures below (or your own)
and renders the results.
