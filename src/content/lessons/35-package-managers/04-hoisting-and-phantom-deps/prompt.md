Two functions that model the npm/Yarn "hoist everything you can" layout from the last
concept, and the bug it enables: phantom dependencies.

## 1. `hoist(root)`

Input is a dependency tree: `{ name, version, deps: DepNode[] }`. `root` is your own
project (its `name`/`version` don't matter — only `root.deps`, its direct dependencies,
matter). Output is a flat map from a `node_modules` path to the version installed
there, in the same shape npm itself would produce.

Walk the tree **depth-first, in declared order** (process each dependency fully,
including everything under it, before moving to its next sibling), maintaining one
`Map<name, version>` of everything currently placed at the **top-level**
`node_modules/`. For each dependency `dep` you encounter, with `parent` being the
package that declared it (or the project root) and `parentPath` being `parent`'s own
home directory (`''` for the root, since the root isn't installed *into* anything):

- **Not seen this name before** → hoist it: its home becomes `node_modules/<dep.name>`,
  record that in both the map and the output, and recurse into `dep.deps` with this new
  home as the parent path (a hoisted package's own dependencies get first crack at the
  top level too — hoisting isn't a one-time, one-level thing).
- **Seen this exact name and version before** → dedupe: it's already on disk, add
  nothing new, and don't recurse into `dep.deps` (this exact version's subtree was
  already resolved the first time it was placed, and the fixtures here never give the
  same name+version two different dependency lists, so nothing is lost by skipping it).
- **Seen this name before, but a different version** → it can't share the slot. Nest it
  directly under the package that depends on it instead: its home becomes
  `${parentPath}node_modules/${dep.name}`, and recurse into *its* `deps` with that
  nested home as the new parent path.

Worked example: a project depends on `b@1.0.0` directly, and also on `a@1.0.0`, which in
turn depends on `b@2.0.0`. Processed in that order, `b@1.0.0` hoists to
`node_modules/b`. Then `a@1.0.0` hoists to `node_modules/a`. Recursing into `a`'s own
dependency on `b@2.0.0`: the name `b` is already taken by a different version
(`1.0.0`), so it nests at `node_modules/a/node_modules/b`. Final layout:

```
{
  'node_modules/b': '1.0.0',
  'node_modules/a': '1.0.0',
  'node_modules/a/node_modules/b': '2.0.0',
}
```

## 2. `phantomImports(layout, rootDeps, imports)`

`layout` is what `hoist` produced. `rootDeps` is the list of package names the project
actually declares in its own `package.json` (`dependencies`). `imports` is a list of
package names the project's own source code imports.

A **phantom dependency** is exactly the failure mode from the last concept: an import
that resolves — because it happens to sit at the *top level* of `node_modules`, where
Node's resolution algorithm will find it — but that the project never declared. It works
by accident of hoisting, and can silently break the moment the tree shifts and that
package is no longer hoisted that high.

Return the subset of `imports` that are both (a) resolvable at the top level (there's a
`node_modules/<name>` entry in `layout` with no further nesting) and (b) absent from
`rootDeps`. An import that isn't in `layout` at all isn't a phantom dependency — it's
just broken, and out of scope here. An import that only exists *nested* (like `b` in the
worked example above, from some other package's point of view) isn't reachable from the
project's own source either, so it doesn't count.
