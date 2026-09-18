export type Bump = 'patch' | 'minor' | 'major';
export type Pkg = { version: string; dependencies: Record<string, string> };
export type Graph = Record<string, Pkg>;

// TODO: see prompt.md. Rewrite workspace:*/^/~/<explicit> and catalog:[name] the way
// pnpm does on publish. Leave any other value untouched.
export function resolveWorkspaceVersions(
  dependencies: Record<string, string>,
  localVersions: Record<string, string>,
  catalog: Record<string, string>,
): Record<string, string> {
  return { ...dependencies };
}

// TODO: see prompt.md. Start from the changesets (highest bump per package wins), then
// cascade: a package that internally depends on a bumped package gets at least a patch
// bump too, repeating until stable. Return new version strings, bumped packages only.
export function bumpChangesets(changesets: Array<{ pkg: string; bump: Bump }>, graph: Graph): Record<string, string> {
  return {};
}

const demoDeps = { react: '^19.3.0', ui: 'workspace:*', utils: 'workspace:^', charts: 'workspace:1.2.3' };
const demoLocalVersions = { ui: '1.4.2', utils: '0.3.0', charts: '1.2.3' };
const demoCatalog = { default: '^19.3.0' };

const demoGraph: Graph = {
  utils: { version: '0.3.0', dependencies: {} },
  ui: { version: '1.4.2', dependencies: { utils: 'workspace:*' } },
  app: { version: '2.0.0', dependencies: { ui: 'workspace:*', utils: 'workspace:*' } },
};

export default function App() {
  const resolved = resolveWorkspaceVersions(demoDeps, demoLocalVersions, demoCatalog);
  const bumped = bumpChangesets([{ pkg: 'utils', bump: 'minor' }], demoGraph);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Resolved dependencies</h2>
      <ul>
        {Object.entries(resolved).map(([name, range]) => (
          <li key={name}>
            {name}: {range}
          </li>
        ))}
      </ul>
      <h2>Bumped versions</h2>
      <ul>
        {Object.entries(bumped).map(([name, version]) => (
          <li key={name}>
            {name}: {version}
          </li>
        ))}
      </ul>
    </div>
  );
}
