First, claim everything entry owns: `for (const id of graph.order) if (entryReachable.has(id)) moduleToChunk.set(id, entryId);`.
That's rule 1, and it has to run before you look at boundaries, since it takes priority
over any async reachability.
---
Precompute each boundary's static-only reachable set once:
`const reachableByBoundary = new Map(boundaryIds.map((b) => [b, reachableFrom(adjacency, b)]));`.
Then for every module id in `graph.order` that ISN'T already in `moduleToChunk` (i.e.
not entry-owned), compute `const reaching = boundaryIds.filter((b) => reachableByBoundary.get(b)!.has(id));`.
---
`reaching.length === 1` → `moduleToChunk.set(id, reaching[0])` — the chunk id is just
that one boundary's own module id. `reaching.length >= 2` → these modules need to be
grouped: build a key with `reaching.slice().sort().join('|')`, collect ids under that
key in a `Map<string, string[]>`, and after the loop assign every id in each group to a
chunk id like `` `shared:${key}` `` (any unique string works — checks find chunks by
which modules they contain, not by id text).
---
If `reaching.length === 0` (a module the traversal reached but no boundary and not
entry — shouldn't happen for a connected graph rooted at one entry, but don't let it
crash), just skip it; leave it unassigned rather than guessing a chunk for it.
