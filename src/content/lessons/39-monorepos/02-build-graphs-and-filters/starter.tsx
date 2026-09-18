export type PkgDef = { path: string; dependencies: Record<string, string>; scripts?: Record<string, string> };
export type Workspace = Record<string, PkgDef>;

// TODO: see prompt.md. Kahn's algorithm over the internal (`workspace:`) dependency
// graph, breaking ties by picking the alphabetically smallest buildable name each round.
// Throw an Error if a cycle leaves packages unplaceable.
export function buildOrder(workspace: Workspace): string[] {
  return [];
}

// TODO: see prompt.md. Directly affected = a changed file falls under the package's
// path. Affected = directly affected, or depends (transitively, via `workspace:`) on an
// affected package. Return sorted, deduped names.
export function affected(workspace: Workspace, changedFiles: string[]): string[] {
  return [];
}

// TODO: see prompt.md. Support "name", "name...", "...name", and the literal
// "[origin/main]" (delegate to `affected`). Return sorted, deduped names.
export function filterExpr(workspace: Workspace, expr: string, changedFiles: string[]): string[] {
  return [];
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
