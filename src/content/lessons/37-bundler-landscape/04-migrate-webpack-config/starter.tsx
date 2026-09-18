export type WebpackConfig = {
  entry?: string | Record<string, string>;
  resolve?: { alias?: Record<string, string>; extensions?: string[] };
  // Simplified stand-in for `new webpack.DefinePlugin({...})`: raw JS values keyed by
  // the identifier they replace, e.g. { 'process.env.API_URL': 'https://api.example.com' }.
  definePlugin?: Record<string, unknown>;
  devServer?: { proxy?: Record<string, string> };
  output?: { publicPath?: string };
  // Informational only -- Vite handles css/svg without a loader, so this never maps
  // to a Vite config field, only (possibly) to a note.
  module?: { rules?: Array<{ test: string; loader?: string }> };
  usesRequireContext?: boolean;
};

export type ViteConfig = {
  resolve?: { alias?: Record<string, string> };
  define?: Record<string, string>;
  server?: { proxy?: Record<string, string> };
  base?: string;
};

export type MigrationResult = {
  vite: ViteConfig;
  notes: string[];
};

export function migrateWebpackConfig(webpack: WebpackConfig, envVarsUsed: string[]): MigrationResult {
  const vite: ViteConfig = {};
  const notes: string[] = [];

  // TODO 1: resolve.alias -- if webpack.resolve?.alias is present, copy it as-is onto
  // vite.resolve.alias.

  // TODO 2: definePlugin -- if webpack.definePlugin is present, build vite.define by
  // JSON.stringify-ing every value (the values in webpack.definePlugin are raw JS
  // values like a string or boolean; Vite's `define` substitutes raw *code*, so a
  // string value has to become a JSON-quoted string literal, not the bare string).

  // TODO 3: devServer.proxy -- if webpack.devServer?.proxy is present, copy it as-is
  // onto vite.server.proxy.

  // TODO 4: output.publicPath -- if webpack.output?.publicPath is present, copy it
  // as-is onto vite.base (no JSON.stringify -- `base` is a plain string field, not
  // injected code).

  // TODO 5: notes -- push a note (any wording, see prompt.md for the required
  // substrings each check looks for) when:
  //   - webpack.entry is present (Vite uses index.html as the entry instead)
  //   - webpack.resolve?.extensions is present (Vite has its own default list)
  //   - webpack.module?.rules is present and non-empty (css/svg loaders are automatic
  //     in Vite -- mention "css" or "svg" and that no loader config is needed)
  //   - webpack.usesRequireContext is true (must mention "import.meta.glob")
  //   - for each name in envVarsUsed that does NOT already start with "VITE_": push
  //     one note per such name that mentions "VITE_" followed immediately by that name
  //     (e.g. for "API_URL", the note must contain the exact text "VITE_API_URL")

  return { vite, notes };
}

function MigrationView({ result }: { result: MigrationResult }) {
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>vite.config.ts</h2>
      <pre>{JSON.stringify(result.vite, null, 2)}</pre>
      <h2>Manual follow-ups</h2>
      <ul>
        {result.notes.map((note, i) => (
          <li key={i}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

const sampleWebpackConfig: WebpackConfig = {
  entry: './src/index.tsx',
  resolve: {
    alias: { '@components': './src/components' },
    extensions: ['.tsx', '.ts', '.js'],
  },
  definePlugin: { 'process.env.API_URL': 'https://api.example.com', FEATURE_FLAG: true },
  devServer: { proxy: { '/api': 'http://localhost:4000' } },
  output: { publicPath: '/app/' },
  module: { rules: [{ test: '\\.css$', loader: 'style-loader' }] },
  usesRequireContext: true,
};

export default function App() {
  const result = migrateWebpackConfig(sampleWebpackConfig, ['API_URL', 'VITE_ANALYTICS_ID']);
  return <MigrationView result={result} />;
}
