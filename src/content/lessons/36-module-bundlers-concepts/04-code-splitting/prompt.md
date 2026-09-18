Given a `ModuleGraph` (the same shape the previous exercise built — `order`, `edges`
for static imports, `dynamicEdges` for `import()` calls), decide which chunk each module
belongs in, Rollup/Vite-style. `App.tsx` already has the plumbing: a static-only
adjacency list, a `reachableFrom` BFS helper, and the code that turns a finished
`moduleToChunk` map into the `{ chunks }` array (including computing each chunk's
`imports` — the other chunks it statically depends on). Your job is the assignment
logic in the middle of `splitChunks`.

Two facts to build on:

- **The entry module is always the last id in `graph.order`.** `buildGraph` (previous
  exercise) does a dependency-first post-order traversal starting from the entry, so the
  entry — having every one of its dependencies visited first — is always pushed last.
  `entryId` and `entryReachable` (its static-only reachable set, entry included) are
  already computed for you.
- **`boundaryIds`** — already computed — is the deduplicated list of every distinct
  dynamic-import target in the graph. Each one is its own async boundary.

Fill in the assignment rule:

1. Anything in `entryReachable` belongs in the entry chunk (`moduleToChunk.set(id,
   entryId)`), full stop — even if some async boundary can also reach it.
2. For everything else, compute which boundaries can reach it: `reachableFrom(adjacency,
   boundaryId)` for each `boundaryId` in `boundaryIds`, then check membership. A module
   reached by **exactly one** boundary belongs in that boundary's own chunk (use the
   boundary's own module id as the chunk id — that boundary module belongs there too,
   since it trivially reaches itself). A module reached by **two or more** boundaries
   belongs in a shared chunk — group modules by their exact set of reaching boundaries
   (sort and join the boundary ids to get a stable grouping key) and give each group its
   own chunk id.

Every module id in `graph.order` needs an entry in `moduleToChunk` by the time your code
finishes (the tail of the function, which builds `chunkModules` and then `chunks` from
that map, is already written).
