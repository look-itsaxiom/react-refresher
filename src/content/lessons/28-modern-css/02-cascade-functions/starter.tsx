export type SpecificityTuple = [number, number, number];

export type CascadeDeclaration = {
  id: string;
  layer: string | null;
  specificity: SpecificityTuple;
  order: number;
  important: boolean;
  value: string;
};

// TODO: return the [a, b, c] specificity tuple for `selector`.
// See prompt.md for the exact supported subset and the :is/:where/:not/:has rules.
export function specificity(_selector: string): SpecificityTuple {
  return [0, 0, 0];
}

// TODO: return the winning declaration given the real cascade algorithm.
// See prompt.md for the bucket order (layer/unlayered x normal/important) and tie-breaks.
export function resolveCascade(
  declarations: CascadeDeclaration[],
  _layerOrder: string[],
): CascadeDeclaration | null {
  return declarations[0] ?? null;
}

const exampleSelectors = ['.card', 'div.card#id', ':has(img)', ':where(#a, .b)', ':is(#a, .b)'];

const exampleDeclarations: CascadeDeclaration[] = [
  { id: 'reset', layer: 'reset', specificity: [0, 0, 1], order: 0, important: false, value: 'red' },
  { id: 'utilities', layer: 'utilities', specificity: [0, 1, 0], order: 1, important: false, value: 'blue' },
  { id: 'unlayered', layer: null, specificity: [0, 0, 0], order: 2, important: false, value: 'green' },
];

export default function App() {
  const winner = resolveCascade(exampleDeclarations, ['reset', 'utilities']);

  return (
    <div style={{ fontFamily: 'monospace', padding: 16 }}>
      <h3>specificity()</h3>
      <table>
        <tbody>
          {exampleSelectors.map((sel) => (
            <tr key={sel}>
              <td>{sel}</td>
              <td>{JSON.stringify(specificity(sel))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>resolveCascade()</h3>
      <p>Winner: {winner ? `${winner.id} (${winner.value})` : 'none'}</p>
    </div>
  );
}
