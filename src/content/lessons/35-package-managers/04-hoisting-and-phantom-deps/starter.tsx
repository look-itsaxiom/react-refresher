export type DepNode = { name: string; version: string; deps: DepNode[] };

// TODO: see prompt.md. Depth-first, in `deps` order; hoist to the top level when the
// name is unseen, dedupe (no entry, no recursion) when the same name+version was
// already placed, and nest directly under the dependent when the name is taken by a
// different version.
export function hoist(root: DepNode): Record<string, string> {
  return {};
}

// TODO: see prompt.md. A name in `imports` is a phantom dependency when `layout` has a
// top-level entry for it (a `node_modules/<name>` key with no further `/node_modules/`
// after it) but `rootDeps` never declared it.
export function phantomImports(layout: Record<string, string>, rootDeps: string[], imports: string[]): string[] {
  return [];
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
