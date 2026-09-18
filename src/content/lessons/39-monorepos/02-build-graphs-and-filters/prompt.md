Three functions that model the graph problems every monorepo task runner solves: what
order to build in, what a change actually affects, and a subset of the pnpm/Turborepo
`--filter` syntax from the last concept.

A workspace is described as:

```ts
type PkgDef = { path: string; dependencies: Record<string, string>; scripts?: Record<string, string> };
type Workspace = Record<string, PkgDef>; // package name -> definition
```

`dependencies` mixes internal and external packages. A dependency is **internal** (part
of this workspace) exactly when its value starts with `workspace:` — `"workspace:*"`,
`"workspace:^"`, anything with that prefix. Everything else (`"^4.17.21"`, `"catalog:"`)
is external and never contributes an edge to these graphs.

## 1. `buildOrder(workspace)`

Return an array of package names in a valid build order: every package appears **after**
every internal dependency it declares. There can be more than one valid order (independent
packages can go in either order relative to each other) — to make the result checkable,
break every tie by picking, among the packages currently buildable (all their internal
dependencies already placed), the **alphabetically first name**.

If the internal dependency graph has a cycle, throw an `Error` (any message) instead of
returning — do not hang or silently drop packages.

## 2. `affected(workspace, changedFiles)`

`changedFiles` is a list of file paths, e.g. `['packages/ui/src/Button.tsx']`. A package
is **directly affected** if some changed file path is under its `path` (the file path
starts with `path` followed by `/`, or equals `path`). A package is **affected** if it is
directly affected, **or** if it declares an internal dependency (directly or
transitively) on a package that is affected — exactly like a real CI affected-graph:
changing a library affects every app that depends on it, not just the library itself.

Return the affected package names as an array, sorted alphabetically.

## 3. `filterExpr(workspace, expr, changedFiles)`

Implements a slice of the `--filter` syntax from the concept:

- `"name"` — just that one package. Throw if `name` isn't in the workspace.
- `"name..."` — `name` plus every package **it depends on**, transitively (its own
  dependency subgraph, via internal dependencies only).
- `"...name"` — `name` plus every package **that depends on it**, transitively (its
  dependents).
- `"[origin/main]"` (exactly this literal string) — equivalent to calling
  `affected(workspace, changedFiles)`.

Return the result as an array of package names, sorted alphabetically, with no
duplicates. `changedFiles` is only relevant to the `[origin/main]` form; ignore it
otherwise.

Ship a tiny default `App` that picks one workspace, computes all three, and renders them
so the preview shows something (the starter already has one — extend it if you add more
fixtures).
