export type DepNode = { name: string; version: string; deps: DepNode[] };

export function hoist(root: DepNode): Record<string, string> {
  const topLevel = new Map<string, string>();
  const layout: Record<string, string> = {};

  function place(node: DepNode, parentPath: string) {
    for (const dep of node.deps) {
      const seen = topLevel.get(dep.name);
      if (seen === undefined) {
        const home = `node_modules/${dep.name}`;
        topLevel.set(dep.name, dep.version);
        layout[home] = dep.version;
        place(dep, home);
      } else if (seen === dep.version) {
        // dedupe: already installed, subtree already resolved
        continue;
      } else {
        const home = `${parentPath}/node_modules/${dep.name}`;
        layout[home] = dep.version;
        place(dep, home);
      }
    }
  }

  place(root, '');
  return layout;
}

export function phantomImports(layout: Record<string, string>, rootDeps: string[], imports: string[]): string[] {
  const declared = new Set(rootDeps);
  const topLevelNames = new Set(
    Object.keys(layout)
      .map((path) => path.match(/^node_modules\/([^/]+)$/))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => m[1]!),
  );
  return imports.filter((name) => topLevelNames.has(name) && !declared.has(name));
}

const demoTree: DepNode = {
  name: 'app',
  version: '0.0.0',
  deps: [
    { name: 'b', version: '1.0.0', deps: [] },
    {
      name: 'a',
      version: '1.0.0',
      deps: [
        { name: 'b', version: '2.0.0', deps: [] },
        { name: 'left-pad', version: '1.3.0', deps: [] },
      ],
    },
  ],
};

export default function App() {
  const layout = hoist(demoTree);
  const paths = Object.keys(layout).sort();
  const phantoms = phantomImports(layout, ['a', 'b'], ['a', 'b', 'left-pad']);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>node_modules layout</h2>
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>path</th>
            <th style={{ textAlign: 'left' }}>version</th>
          </tr>
        </thead>
        <tbody>
          {paths.map((p) => (
            <tr key={p}>
              <td>{p}</td>
              <td>{layout[p]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Phantom imports</h2>
      <p>{phantoms.join(', ') || 'none'}</p>
    </div>
  );
}
