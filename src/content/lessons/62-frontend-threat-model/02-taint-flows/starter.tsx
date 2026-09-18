export type NodeKind = 'source' | 'transform' | 'sink';
export type GraphNode = { id: string; kind: NodeKind; label: string };
export type GraphEdge = { from: string; to: string };
export type Graph = { nodes: GraphNode[]; edges: GraphEdge[] };

export type Severity = 'critical' | 'high' | 'medium';
export type TaintPath = { path: string[]; sink: string; severity: Severity };

// Sink label -> transform labels that neutralize it. A sink with NO entry here is
// always safe (e.g. 'React text', which React escapes automatically) and can never be
// flagged. A sink with an entry but an EMPTY array (e.g. 'eval') can never be
// neutralized -- any untrusted value reaching it is a hit.
export const SINK_SANITIZERS: Record<string, string[]> = {
  innerHTML: ['sanitize'],
  dangerouslySetInnerHTML: ['sanitize'],
  '<a href>': ['sanitize'],
  href: ['sanitize'],
  'location.assign': ['sanitize'],
  'document.cookie': ['sanitize'],
  'fetch(url)': ['encodeURIComponent', 'validateSchema'],
  eval: [],
};

export const SINK_SEVERITY: Record<string, Severity> = {
  eval: 'critical',
  innerHTML: 'critical',
  dangerouslySetInnerHTML: 'critical',
  'location.assign': 'high',
  href: 'high',
  '<a href>': 'high',
  'document.cookie': 'high',
  'fetch(url)': 'medium',
};

type Candidate = { path: string[]; sinkLabel: string; transformLabels: string[] };

// Already wired: walks every simple path from a 'source' node to a 'sink' node,
// stopping at the sink, and records every transform label passed through along the
// way. You don't need to touch this.
function collectSinkPaths(graph: Graph): Candidate[] {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, string[]>();
  for (const edge of graph.edges) {
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  }

  const results: Candidate[] = [];

  function walk(nodeId: string, path: string[], transformLabels: string[], visited: Set<string>) {
    const node = byId.get(nodeId);
    if (!node || visited.has(nodeId)) return;
    const nextVisited = new Set(visited);
    nextVisited.add(nodeId);
    const nextPath = [...path, nodeId];

    if (node.kind === 'sink') {
      results.push({ path: nextPath, sinkLabel: node.label, transformLabels });
      return;
    }

    const nextTransforms = node.kind === 'transform' ? [...transformLabels, node.label] : transformLabels;
    for (const nextId of outgoing.get(nodeId) ?? []) {
      walk(nextId, nextPath, nextTransforms, nextVisited);
    }
  }

  for (const node of graph.nodes) {
    if (node.kind === 'source') walk(node.id, [], [], new Set());
  }

  return results;
}

// TODO: return true if this path is safe -- either `sinkLabel` has no entry in
// SINK_SANITIZERS (always safe), or it has an entry and `transformLabels` contains at
// least one of the labels that entry lists. A sink whose entry is an empty array can
// never return true.
function isNeutralized(sinkLabel: string, transformLabels: string[]): boolean {
  return true;
}

export function taintFlows(graph: Graph): TaintPath[] {
  const candidates = collectSinkPaths(graph);
  const flagged: TaintPath[] = [];

  // TODO: for each candidate, skip it when isNeutralized(candidate.sinkLabel,
  // candidate.transformLabels) is true. Otherwise push a TaintPath: { path:
  // candidate.path, sink: candidate.sinkLabel, severity: SINK_SEVERITY[sinkLabel]
  // (default to 'medium' if somehow missing) }.

  return flagged;
}

const sampleGraph: Graph = {
  nodes: [
    { id: 'src-hash', kind: 'source', label: 'location.hash' },
    { id: 'src-fetch', kind: 'source', label: 'fetch response' },
    { id: 'src-input', kind: 'source', label: 'user input' },
    { id: 't-sanitize-1', kind: 'transform', label: 'sanitize' },
    { id: 't-sanitize-2', kind: 'transform', label: 'sanitize' },
    { id: 't-parse', kind: 'transform', label: 'JSON.parse' },
    { id: 't-encode', kind: 'transform', label: 'encodeURIComponent' },
    { id: 'sink-innerhtml', kind: 'sink', label: 'innerHTML' },
    { id: 'sink-href', kind: 'sink', label: 'href' },
    { id: 'sink-text', kind: 'sink', label: 'React text' },
    { id: 'sink-fetch', kind: 'sink', label: 'fetch(url)' },
    { id: 'sink-eval', kind: 'sink', label: 'eval' },
  ],
  edges: [
    { from: 'src-hash', to: 'sink-innerhtml' },
    { from: 'src-hash', to: 't-sanitize-1' },
    { from: 't-sanitize-1', to: 'sink-innerhtml' },
    { from: 'src-fetch', to: 't-parse' },
    { from: 't-parse', to: 'sink-text' },
    { from: 'src-input', to: 'sink-href' },
    { from: 'src-input', to: 't-encode' },
    { from: 't-encode', to: 'sink-fetch' },
    { from: 'src-fetch', to: 'sink-eval' },
  ],
};

function labelFor(graph: Graph, id: string): string {
  return graph.nodes.find((n) => n.id === id)?.label ?? id;
}

export default function App() {
  const flows = taintFlows(sampleGraph);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>{flows.length} unsanitized flow(s) found</h2>
      <ul>
        {flows.map((flow, i) => (
          <li key={i}>
            <strong>[{flow.severity}]</strong> {flow.path.map((id) => labelFor(sampleGraph, id)).join(' -> ')}
          </li>
        ))}
      </ul>
    </div>
  );
}
