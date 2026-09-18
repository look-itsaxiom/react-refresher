export type LayerName = 'reset' | 'base' | 'tokens' | 'components' | 'utilities' | 'overrides';
export type LayerChunk = { layer: LayerName | null; css: string };
export type LayerResult = { css: string; warnings: string[] };

const DEFAULT_ORDER: LayerName[] = ['reset', 'base', 'tokens', 'components', 'utilities', 'overrides'];

export function specificity(_selector: string): [number, number, number] {
  // TODO: implement the CSS specificity algorithm.
  return [0, 0, 0];
}

export function layerStylesheet(chunks: LayerChunk[], order: LayerName[] = DEFAULT_ORDER): LayerResult {
  // TODO: build the `@layer` statement, merge chunks per layer, keep null-layer chunks
  // outside with a warning, and :where()-wrap selectors in reset/base.
  return { css: `@layer ${order.join(', ')};`, warnings: [] };
}

const sample = layerStylesheet([
  { layer: 'reset', css: '*, *::before, *::after { box-sizing: border-box; }' },
  { layer: 'components', css: '.card { padding: 1rem; }' },
  { layer: null, css: '.legacy-widget { color: red; }' },
  { layer: 'utilities', css: '.p-0 { padding: 0; }' },
]);

export default function App() {
  return (
    <div>
      <h1>Layered stylesheet</h1>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{sample.css}</pre>
      {sample.warnings.length > 0 && (
        <ul>
          {sample.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
