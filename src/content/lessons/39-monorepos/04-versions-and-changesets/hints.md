For `resolveWorkspaceVersions`, loop over `Object.entries(dependencies)` and branch on
the string: `startsWith('workspace:*')`, `startsWith('workspace:^')`,
`startsWith('workspace:~')`, `startsWith('workspace:')` (the catch-all "explicit
version" case — check it last, after the three specific ones), `startsWith('catalog:')`,
else leave it alone. For the catalog case, `value.slice('catalog:'.length) || 'default'`
gets you the catalog name (empty string when it was bare `"catalog:"`).
---
For the explicit-version `workspace:` case, `value.slice('workspace:'.length)` is
already the string to use as-is — no lookup needed, that's the whole point of that
branch existing separately from the `*`/`^`/`~` ones.
---
For `bumpChangesets`, first reduce `changesets` into a `Map<string, Bump>` keeping the
highest bump per package (rank `patch < minor < major`). Then build the internal
dependency graph (same `workspace:`-prefix rule as before) and its reverse (dependents),
and run a fixed-point loop: repeatedly scan every package; if it has a bump level lower
than `patch` (i.e. none) but internally depends on a package that currently has *any*
bump level, set it to at least `patch`; stop when a full pass makes no changes.
---
Once you have the final `Map<string, Bump>`, computing new versions is a small
`bumpVersion(version, bump)` helper: split on `.`, parse to numbers, and return the
bumped triple joined back with `.`. Only include a package in the returned object if it
has an entry in that map.
