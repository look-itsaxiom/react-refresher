A bundler's first job — before tree shaking, before chunking, before any of it — is
building the module graph: walk every `import`, resolve each specifier to a concrete
module id, and record the result in an order where every module's dependencies appear
before it. `App.tsx` gives you two functions to finish against that same idea, using
plain strings as a stand-in for files on disk.

## 1. `buildGraph(files, entry)`

`files` is a map of module id to source text; `entry` is the id to start from. Two
regexes are already provided, both used with `source.matchAll(...)`:

- `STATIC_IMPORT_RE` finds a static `import ... from './x.js'` (or a side-effect-only
  `import './x.js'`) and captures the specifier.
- `DYNAMIC_IMPORT_RE` finds a dynamic `import('./x.js')` call and captures the specifier.

`resolveRelative(fromId, specifier)` is fully implemented — call it to turn a captured
specifier into a module id relative to the file that imported it.

Inside `visit(id)`, for every static specifier found in that module's source: resolve
it, push `{ from: id, to: resolved }` onto `edges`, and call `visit(resolved)` — the
recursive call has to happen *before* `id` is pushed onto `order`, so dependencies land
first. Do the same for dynamic specifiers, pushing onto `dynamicEdges` instead, and
still recursing — a dynamically-imported module is still part of the graph, just reached
across an async boundary instead of a static one.

The `visited` / `visiting` bookkeeping is already there to stop a cycle from recursing
forever: if `visit` is called again for a module that's currently being visited (an
ancestor in the current call stack), it just returns — the edge into it was already
recorded, so the cycle shows up in `edges`, it just doesn't get walked twice.

## 2. `treeShake(graph, files)`

Two more regexes are provided:

- `NAMED_IMPORT_RE` finds `import { a, b } from './x.js'` and captures the raw name list
  and the specifier.
- `EXPORT_RE` finds `export const x = ...` or `export function x() {}` and captures the
  name.

First loop: for every module in `graph.order`, scan its source with `NAMED_IMPORT_RE`.
For each match, split the name list on commas (trim whitespace), resolve the specifier
with `resolveRelative`, and record those names as "used" against the *target* module —
not the module doing the importing.

Second loop: for every module, scan its source with `EXPORT_RE` to get its declared
export names, then subtract the names recorded as used against that module. What's left
is `unusedExports[id]`.
