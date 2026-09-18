For `buildOrder`, this is Kahn's algorithm: compute each package's internal
dependencies (values starting with `"workspace:"`), then repeatedly pick, from the
packages not yet placed whose internal dependencies are *all* already placed, the
alphabetically smallest name. If no package qualifies on some iteration but packages
remain unplaced, that's a cycle — throw.
---
For `affected`, first compute the "directly affected" set by checking each package's
`path` against every changed file (`file === path || file.startsWith(path + '/')`). Then
build a reverse-dependency map (for each internal dependency edge `pkg -> dep`, record
`dep -> pkg` too) and do a BFS/DFS from the directly-affected set following those reverse
edges — every package you reach is affected because it depends on something that
changed.
---
For `filterExpr`, handle `"[origin/main]"` first as a special case (call `affected` and
sort). Otherwise strip a trailing `"..."` (dependencies mode) or a leading `"..."`
(dependents mode) — at most one of the two will be present per the syntax this exercise
covers — to get the bare package name, and throw if it's not a real package. Reuse a
small internal-dependency-graph walk (forward for `name...`, using the same reverse map
as `affected` for `...name`) to collect the transitive set, then always include `name`
itself.
---
A internal-dependency helper worth writing once and reusing across all three functions:
`function internalDeps(def: PkgDef): string[] { return Object.entries(def.dependencies).filter(([, v]) => v.startsWith('workspace:')).map(([k]) => k); }`.
Build the forward graph (name -> internalDeps) once, derive the reverse graph from it
once, and every function below becomes a graph traversal over one of the two.
