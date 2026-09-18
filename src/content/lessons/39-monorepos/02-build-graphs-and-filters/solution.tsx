export type PkgDef = { path: string; dependencies: Record<string, string>; scripts?: Record<string, string> };
export type Workspace = Record<string, PkgDef>;

function internalDeps(def: PkgDef): string[] {
  return Object.entries(def.dependencies)
    .filter(([, v]) => v.startsWith('workspace:'))
    .map(([name]) => name);
}

function forwardGraph(workspace: Workspace): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const [name, def] of Object.entries(workspace)) {
    graph.set(name, internalDeps(def));
  }
  return graph;
}

function reverseGraph(forward: Map<string, string[]>): Map<string, string[]> {
  const reverse = new Map<string, string[]>();
  for (const name of forward.keys()) reverse.set(name, []);
  for (const [name, deps] of forward) {
    for (const dep of deps) {
      reverse.get(dep)?.push(name);
    }
  }
  return reverse;
}

function transitiveClosure(start: string[], graph: Map<string, string[]>): Set<string> {
  const seen = new Set<string>(start);
  const queue = [...start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of graph.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

export function buildOrder(workspace: Workspace): string[] {
  const forward = forwardGraph(workspace);
  const placed = new Set<string>();
  const order: string[] = [];
  const remaining = new Set(forward.keys());

  while (remaining.size > 0) {
    const buildable = [...remaining]
      .filter((name) => forward.get(name)!.every((dep) => placed.has(dep)))
      .sort();

    if (buildable.length === 0) {
      throw new Error('cycle detected in internal dependency graph');
    }

    const next = buildable[0]!;
    order.push(next);
    placed.add(next);
    remaining.delete(next);
  }

  return order;
}

export function affected(workspace: Workspace, changedFiles: string[]): string[] {
  const directlyAffected = Object.entries(workspace)
    .filter(([, def]) => changedFiles.some((file) => file === def.path || file.startsWith(`${def.path}/`)))
    .map(([name]) => name);

  const forward = forwardGraph(workspace);
  const reverse = reverseGraph(forward);
  const result = transitiveClosure(directlyAffected, reverse);
  return [...result].sort();
}

export function filterExpr(workspace: Workspace, expr: string, changedFiles: string[]): string[] {
  if (expr === '[origin/main]') {
    return affected(workspace, changedFiles);
  }

  const forward = forwardGraph(workspace);

  let name = expr;
  let withDependencies = false;
  let withDependents = false;

  if (name.endsWith('...')) {
    withDependencies = true;
    name = name.slice(0, -3);
  } else if (name.startsWith('...')) {
    withDependents = true;
    name = name.slice(3);
  }

  if (!(name in workspace)) {
    throw new Error(`unknown package: ${name}`);
  }

  if (withDependencies) {
    return [...transitiveClosure([name], forward)].sort();
  }
  if (withDependents) {
    const reverse = reverseGraph(forward);
    return [...transitiveClosure([name], reverse)].sort();
  }
  return [name];
}

const demoWorkspace: Workspace = {
  app: {
    path: 'apps/app',
    dependencies: { ui: 'workspace:*', utils: 'workspace:*', react: '^19.3.0' },
  },
  ui: {
    path: 'packages/ui',
    dependencies: { utils: 'workspace:*', react: '^19.3.0' },
  },
  utils: {
    path: 'packages/utils',
    dependencies: {},
  },
  docs: {
    path: 'apps/docs',
    dependencies: { ui: 'workspace:*' },
  },
};

export default function App() {
  const order = buildOrder(demoWorkspace);
  const affectedByUtils = affected(demoWorkspace, ['packages/utils/src/index.ts']);
  const filtered = filterExpr(demoWorkspace, 'ui...', []);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Build order</h2>
      <p>{order.join(' -> ') || '(empty)'}</p>
      <h2>Affected by a change in utils</h2>
      <p>{affectedByUtils.join(', ') || '(empty)'}</p>
      <h2>filterExpr(&quot;ui...&quot;)</h2>
      <p>{filtered.join(', ') || '(empty)'}</p>
    </div>
  );
}
