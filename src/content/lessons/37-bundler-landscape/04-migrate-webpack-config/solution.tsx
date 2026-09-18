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

  if (webpack.resolve?.alias) {
    vite.resolve = { alias: { ...webpack.resolve.alias } };
  }

  if (webpack.definePlugin) {
    const define: Record<string, string> = {};
    for (const [key, value] of Object.entries(webpack.definePlugin)) {
      define[key] = JSON.stringify(value);
    }
    vite.define = define;
  }

  if (webpack.devServer?.proxy) {
    vite.server = { proxy: { ...webpack.devServer.proxy } };
  }

  if (webpack.output?.publicPath) {
    vite.base = webpack.output.publicPath;
  }

  if (webpack.entry) {
    notes.push('Vite uses index.html as the entry point instead of a JS `entry` field -- move your bootstrap script into a <script type="module"> tag there.');
  }

  if (webpack.resolve?.extensions) {
    notes.push('Vite already has a default `resolve.extensions` list; only port webpack\'s list if it relies on a custom order or an extension Vite does not include by default.');
  }

  if (webpack.module?.rules && webpack.module.rules.length > 0) {
    notes.push('css and svg module.rules are unnecessary in Vite -- css and svg-as-URL imports work without a loader; port a custom loader like svgr as a Vite plugin instead.');
  }

  if (webpack.usesRequireContext) {
    notes.push('Rewrite require.context(...) calls as import.meta.glob(...) -- there is no automated equivalent.');
  }

  for (const name of envVarsUsed) {
    if (!name.startsWith('VITE_')) {
      notes.push(`Rename the ${name} env var to VITE_${name} (and use import.meta.env.VITE_${name}) -- Vite only exposes VITE_-prefixed variables to client code.`);
    }
  }

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
