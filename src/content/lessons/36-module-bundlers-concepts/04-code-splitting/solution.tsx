export type ModuleGraph = {
  order: string[];
  edges: Array<{ from: string; to: string }>;
  dynamicEdges: Array<{ from: string; to: string }>;
};

export type Chunk = { id: string; modules: string[]; imports: string[] };

// Builds a static-only adjacency list (dynamic edges are deliberately excluded — an
// async boundary is exactly the place a bundler stops following edges eagerly).
function buildStaticAdjacency(graph: ModuleGraph): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const id of graph.order) adjacency.set(id, []);
  for (const { from, to } of graph.edges) {
    adjacency.get(from)?.push(to);
  }
  return adjacency;
}

// BFS over the static-only adjacency list. The root is included in its own result.
function reachableFrom(adjacency: Map<string, string[]>, root: string): Set<string> {
  const seen = new Set<string>([root]);
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen;
}

export function splitChunks(graph: ModuleGraph): { chunks: Chunk[] } {
  const adjacency = buildStaticAdjacency(graph);

  // buildGraph (previous exercise) always pushes the entry module last, since it's the
  // root of the dependency-first traversal.
  const entryId = graph.order[graph.order.length - 1]!;
  const entryReachable = reachableFrom(adjacency, entryId);

  // Every distinct dynamic-import target is its own async boundary.
  const boundaryIds = [...new Set(graph.dynamicEdges.map((e) => e.to))];
  const reachableByBoundary = new Map<string, Set<string>>(
    boundaryIds.map((b) => [b, reachableFrom(adjacency, b)]),
  );

  const moduleToChunk = new Map<string, string>();

  // Rule 1: entry reachability wins, no matter how many async boundaries also reach it.
  for (const id of graph.order) {
    if (entryReachable.has(id)) moduleToChunk.set(id, entryId);
  }

  // Rule 2: group everything else by the exact set of boundaries that reach it.
  const groupModules = new Map<string, string[]>();
  const groupBoundaries = new Map<string, string[]>();
  for (const id of graph.order) {
    if (moduleToChunk.has(id)) continue;
    const reaching = boundaryIds.filter((b) => reachableByBoundary.get(b)!.has(id));
    if (reaching.length === 0) continue; // unreachable from anywhere that matters here

    const key = reaching.slice().sort().join('|');
    if (!groupModules.has(key)) groupModules.set(key, []);
    groupModules.get(key)!.push(id);
    groupBoundaries.set(key, reaching);
  }

  for (const [key, modules] of groupModules) {
    const boundaries = groupBoundaries.get(key)!;
    const chunkId = boundaries.length === 1 ? boundaries[0]! : `shared:${key}`;
    for (const id of modules) moduleToChunk.set(id, chunkId);
  }

  const chunkModules = new Map<string, string[]>();
  for (const [moduleId, chunkId] of moduleToChunk) {
    if (!chunkModules.has(chunkId)) chunkModules.set(chunkId, []);
    chunkModules.get(chunkId)!.push(moduleId);
  }

  const chunks: Chunk[] = [...chunkModules.entries()].map(([id, modules]) => {
    const imports = new Set<string>();
    for (const moduleId of modules) {
      for (const target of adjacency.get(moduleId) ?? []) {
        const targetChunk = moduleToChunk.get(target);
        if (targetChunk && targetChunk !== id) imports.add(targetChunk);
      }
    }
    return { id, modules, imports: [...imports] };
  });

  return { chunks };
}

function ChunkReport({ chunks }: { chunks: Chunk[] }) {
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Chunks</h2>
      <ul>
        {chunks.map((c) => (
          <li key={c.id}>
            <strong>{c.id}</strong>: [{c.modules.join(', ')}]
            {c.imports.length > 0 && <> imports [{c.imports.join(', ')}]</>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const sampleGraph: ModuleGraph = {
  order: ['shared.js', 'routeA.js', 'routeB.js', 'entry.js'],
  edges: [
    { from: 'routeA.js', to: 'shared.js' },
    { from: 'routeB.js', to: 'shared.js' },
  ],
  dynamicEdges: [
    { from: 'entry.js', to: 'routeA.js' },
    { from: 'entry.js', to: 'routeB.js' },
  ],
};

export default function App() {
  const { chunks } = splitChunks(sampleGraph);
  return <ChunkReport chunks={chunks} />;
}
