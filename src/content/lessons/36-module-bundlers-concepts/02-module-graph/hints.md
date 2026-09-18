Start with `buildGraph`. Inside `visit(id)`, after computing `source`, write:
`for (const m of source.matchAll(STATIC_IMPORT_RE)) { ... }` — `m[1]` is the specifier.
Resolve it with `resolveRelative(id, m[1])`, push the edge, then call `visit(resolved)`
*before* moving to the next match. Repeat the same shape for `DYNAMIC_IMPORT_RE`, but
push onto `dynamicEdges`.
---
The order matters: push the edge and recurse into the dependency *while* you're still
inside `visit(id)`, before the function reaches its own `order.push(id)` call at the
bottom (which is already written). That's what makes the final order dependency-first —
a module's dependencies finish their own `visit()` calls, and therefore get pushed onto
`order`, before the module that imported them does.
---
For `treeShake`'s first loop, iterate `graph.order`, and for each module id do
`for (const m of (files[id] ?? '').matchAll(NAMED_IMPORT_RE)) { ... }`. `m[1]` is the raw
name list (`"add, subtract"` — split on `,` and `.trim()` each piece, and drop empty
strings), `m[2]` is the specifier to resolve with `resolveRelative(id, m[2])`. Add each
trimmed name to `usedByModule.get(resolvedTarget)` — create the set first with
`?? new Set()` and `.set(...)` back if the target isn't already a key (a module reached
only through a dynamic import might not have been pre-seeded).
---
For the second loop, `[...( (files[id] ?? '').matchAll(EXPORT_RE) )].map(m => m[1])`
gives every exported name for module `id`. Filter out anything present in
`usedByModule.get(id)` (default to an empty set if there's no entry) and assign the
result to `unusedExports[id]`.
