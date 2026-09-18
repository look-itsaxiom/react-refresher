export type ModuleGraph = {
  order: string[];
  edges: Array<{ from: string; to: string }>;
  dynamicEdges: Array<{ from: string; to: string }>;
};

// Resolves a relative specifier against the file that imports it.
// resolveRelative('src/pages/a.js', './widgets/chart.js') -> 'src/pages/widgets/chart.js'
// resolveRelative('src/pages/a.js', '../shared.js')       -> 'src/shared.js'
export function resolveRelative(fromId: string, specifier: string): string {
  const parts = fromId.split('/');
  parts.pop(); // drop the importer's own file name, keep its directory
  for (const seg of specifier.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

// Matches a static `import ... from './x.js'`, or a side-effect-only `import './x.js'`.
// Capture group 1 is the specifier.
const STATIC_IMPORT_RE = /import\s+(?:[\s\S]*?\s+from\s+)?['"](\.[^'"]+)['"]/g;
// Matches a dynamic `import('./x.js')`. Capture group 1 is the specifier.
const DYNAMIC_IMPORT_RE = /import\(\s*['"](\.[^'"]+)['"]\s*\)/g;

export function buildGraph(files: Record<string, string>, entry: string): ModuleGraph {
  const edges: Array<{ from: string; to: string }> = [];
  const dynamicEdges: Array<{ from: string; to: string }> = [];
  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(id: string): void {
    if (visited.has(id) || visiting.has(id)) return;
    visiting.add(id);
    const source = files[id] ?? '';

    for (const m of source.matchAll(STATIC_IMPORT_RE)) {
      const resolved = resolveRelative(id, m[1]!);
      edges.push({ from: id, to: resolved });
      visit(resolved);
    }

    for (const m of source.matchAll(DYNAMIC_IMPORT_RE)) {
      const resolved = resolveRelative(id, m[1]!);
      dynamicEdges.push({ from: id, to: resolved });
      visit(resolved);
    }

    visiting.delete(id);
    visited.add(id);
    order.push(id);
  }

  visit(entry);
  return { order, edges, dynamicEdges };
}

// Matches a named import list: `import { a, b } from './x.js'`.
// Capture group 1 is the raw, comma-separated name list; group 2 is the specifier.
const NAMED_IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/g;
// Matches a named export declaration: `export const x = ...` or `export function x() {}`.
// Capture group 1 is the exported name.
const EXPORT_RE = /export\s+(?:const|function)\s+(\w+)/g;

export function treeShake(graph: ModuleGraph, files: Record<string, string>): Record<string, string[]> {
  const usedByModule = new Map<string, Set<string>>();
  for (const id of graph.order) usedByModule.set(id, new Set());

  for (const id of graph.order) {
    const source = files[id] ?? '';
    for (const m of source.matchAll(NAMED_IMPORT_RE)) {
      const names = (m[1] ?? '')
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);
      const target = resolveRelative(id, m[2]!);
      if (!usedByModule.has(target)) usedByModule.set(target, new Set());
      const used = usedByModule.get(target)!;
      for (const name of names) used.add(name);
    }
  }

  const unusedExports: Record<string, string[]> = {};
  for (const id of graph.order) {
    const source = files[id] ?? '';
    const exportNames = [...source.matchAll(EXPORT_RE)].map((m) => m[1]!);
    const used = usedByModule.get(id) ?? new Set<string>();
    unusedExports[id] = exportNames.filter((name) => !used.has(name));
  }

  return unusedExports;
}

function GraphReport({ graph, unused }: { graph: ModuleGraph; unused: Record<string, string[]> }) {
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Order (dependency-first)</h2>
      <ol>
        {graph.order.map((id) => (
          <li key={id}>{id}</li>
        ))}
      </ol>
      <h2>Static edges</h2>
      <ul>
        {graph.edges.map((e, i) => (
          <li key={i}>
            {e.from} → {e.to}
          </li>
        ))}
      </ul>
      <h2>Dynamic edges</h2>
      <ul>
        {graph.dynamicEdges.map((e, i) => (
          <li key={i}>
            {e.from} ⇢ {e.to}
          </li>
        ))}
      </ul>
      <h2>Unused exports</h2>
      <ul>
        {Object.entries(unused).map(([id, names]) => (
          <li key={id}>
            {id}: {names.length ? names.join(', ') : '(none)'}
          </li>
        ))}
      </ul>
    </div>
  );
}

const sampleFiles: Record<string, string> = {
  'entry.js': `
    import { add } from './math.js';
    import('./lazy.js');
    console.log(add(1, 2));
  `,
  'math.js': `
    export const add = (a, b) => a + b;
    export const subtract = (a, b) => a - b;
  `,
  'lazy.js': `
    import { add } from './math.js';
    export function run() { return add(2, 2); }
  `,
};

export default function App() {
  const graph = buildGraph(sampleFiles, 'entry.js');
  const unused = treeShake(graph, sampleFiles);
  return <GraphReport graph={graph} unused={unused} />;
}
