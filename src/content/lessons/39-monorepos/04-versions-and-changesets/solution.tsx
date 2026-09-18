export type Bump = 'patch' | 'minor' | 'major';
export type Pkg = { version: string; dependencies: Record<string, string> };
export type Graph = Record<string, Pkg>;

export function resolveWorkspaceVersions(
  dependencies: Record<string, string>,
  localVersions: Record<string, string>,
  catalog: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [name, value] of Object.entries(dependencies)) {
    if (value.startsWith('workspace:*')) {
      result[name] = localVersions[name]!;
    } else if (value.startsWith('workspace:^')) {
      result[name] = `^${localVersions[name]}`;
    } else if (value.startsWith('workspace:~')) {
      result[name] = `~${localVersions[name]}`;
    } else if (value.startsWith('workspace:')) {
      result[name] = value.slice('workspace:'.length);
    } else if (value.startsWith('catalog:')) {
      const catalogName = value.slice('catalog:'.length) || 'default';
      result[name] = catalog[catalogName]!;
    } else {
      result[name] = value;
    }
  }

  return result;
}

const RANK: Record<Bump, number> = { patch: 1, minor: 2, major: 3 };

function higherBump(a: Bump | undefined, b: Bump): Bump {
  if (!a) return b;
  return RANK[b] > RANK[a] ? b : a;
}

function bumpVersion(version: string, bump: Bump): string {
  const [major, minor, patch] = version.split('.').map((n) => Number.parseInt(n, 10));
  if (bump === 'major') return `${major! + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor! + 1}.0`;
  return `${major}.${minor}.${patch! + 1}`;
}

function internalDeps(pkg: Pkg): string[] {
  return Object.entries(pkg.dependencies)
    .filter(([, v]) => v.startsWith('workspace:'))
    .map(([name]) => name);
}

export function bumpChangesets(changesets: Array<{ pkg: string; bump: Bump }>, graph: Graph): Record<string, string> {
  const bumps = new Map<string, Bump>();
  for (const { pkg, bump } of changesets) {
    bumps.set(pkg, higherBump(bumps.get(pkg), bump));
  }

  const dependents = new Map<string, string[]>();
  for (const name of Object.keys(graph)) dependents.set(name, []);
  for (const [name, pkg] of Object.entries(graph)) {
    for (const dep of internalDeps(pkg)) {
      dependents.get(dep)?.push(name);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, pkg] of Object.entries(graph)) {
      for (const dep of internalDeps(pkg)) {
        if (bumps.has(dep) && !bumps.has(name)) {
          bumps.set(name, 'patch');
          changed = true;
        }
      }
    }
  }

  const result: Record<string, string> = {};
  for (const [name, bump] of bumps) {
    const current = graph[name]?.version;
    if (current) result[name] = bumpVersion(current, bump);
  }
  return result;
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
