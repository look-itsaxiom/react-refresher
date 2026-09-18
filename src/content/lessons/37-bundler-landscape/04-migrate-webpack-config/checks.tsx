import type { Check } from '../../../types';

type WebpackConfig = {
  entry?: string | Record<string, string>;
  resolve?: { alias?: Record<string, string>; extensions?: string[] };
  definePlugin?: Record<string, unknown>;
  devServer?: { proxy?: Record<string, string> };
  output?: { publicPath?: string };
  module?: { rules?: Array<{ test: string; loader?: string }> };
  usesRequireContext?: boolean;
};
type ViteConfig = {
  resolve?: { alias?: Record<string, string> };
  define?: Record<string, string>;
  server?: { proxy?: Record<string, string> };
  base?: string;
};
type MigrationResult = { vite: ViteConfig; notes: string[] };

export const checks: Check[] = [
  {
    name: 'resolve.alias and devServer.proxy are copied through to vite.resolve.alias and vite.server.proxy',
    run: async ({ mod, expect }) => {
      const migrateWebpackConfig = mod.migrateWebpackConfig as (w: WebpackConfig, envVars: string[]) => MigrationResult;
      const result = migrateWebpackConfig(
        {
          resolve: { alias: { '@utils': './src/utils' } },
          devServer: { proxy: { '/api': 'http://localhost:4000' } },
        },
        [],
      );
      expect(result.vite.resolve).to.deep.equal({ alias: { '@utils': './src/utils' } });
      expect(result.vite.server).to.deep.equal({ proxy: { '/api': 'http://localhost:4000' } });
    },
  },
  {
    name: 'definePlugin values are JSON-stringified, not copied as bare values',
    run: async ({ mod, expect }) => {
      const migrateWebpackConfig = mod.migrateWebpackConfig as (w: WebpackConfig, envVars: string[]) => MigrationResult;
      const result = migrateWebpackConfig(
        { definePlugin: { 'process.env.API_URL': 'https://api.example.com', FEATURE_FLAG: true } },
        [],
      );
      expect(result.vite.define).to.deep.equal({
        'process.env.API_URL': JSON.stringify('https://api.example.com'),
        FEATURE_FLAG: JSON.stringify(true),
      });
      // A stringified string value must be re-parseable as a quoted JS string literal,
      // not the bare, syntactically-invalid original.
      expect(result.vite.define!['process.env.API_URL']).to.equal('"https://api.example.com"');
    },
  },
  {
    name: 'output.publicPath maps to vite.base as a plain string (not JSON-stringified)',
    run: async ({ mod, expect }) => {
      const migrateWebpackConfig = mod.migrateWebpackConfig as (w: WebpackConfig, envVars: string[]) => MigrationResult;
      const result = migrateWebpackConfig({ output: { publicPath: '/app/' } }, []);
      expect(result.vite.base).to.equal('/app/');
    },
  },
  {
    name: 'vite config fields are omitted entirely when the corresponding webpack field is absent',
    run: async ({ mod, expect }) => {
      const migrateWebpackConfig = mod.migrateWebpackConfig as (w: WebpackConfig, envVars: string[]) => MigrationResult;
      const result = migrateWebpackConfig({}, []);
      expect(result.vite.resolve).to.equal(undefined);
      expect(result.vite.define).to.equal(undefined);
      expect(result.vite.server).to.equal(undefined);
      expect(result.vite.base).to.equal(undefined);
      expect(result.notes).to.deep.equal([]);
    },
  },
  {
    name: 'entry, resolve.extensions, usesRequireContext, and non-empty module.rules each produce an informational note',
    run: async ({ mod, expect }) => {
      const migrateWebpackConfig = mod.migrateWebpackConfig as (w: WebpackConfig, envVars: string[]) => MigrationResult;
      const result = migrateWebpackConfig(
        {
          entry: './src/index.tsx',
          resolve: { extensions: ['.ts', '.tsx'] },
          module: { rules: [{ test: '\\.svg$', loader: 'svgr' }] },
          usesRequireContext: true,
        },
        [],
      );
      expect(result.notes).to.have.lengthOf(4);
      expect(result.notes.some((n) => /index\.html/i.test(n))).to.equal(true);
      expect(result.notes.some((n) => /extensions/i.test(n))).to.equal(true);
      expect(result.notes.some((n) => /svg|css/i.test(n))).to.equal(true);
      expect(result.notes.some((n) => n.includes('import.meta.glob'))).to.equal(true);
    },
  },
  {
    name: 'module.rules with an empty array produces no note, and no notes fire when nothing applies',
    run: async ({ mod, expect }) => {
      const migrateWebpackConfig = mod.migrateWebpackConfig as (w: WebpackConfig, envVars: string[]) => MigrationResult;
      const result = migrateWebpackConfig({ module: { rules: [] } }, ['VITE_ALREADY_PREFIXED']);
      expect(result.notes).to.deep.equal([]);
    },
  },
  {
    name: 'each non-VITE_-prefixed env var produces one note naming its VITE_-prefixed form; already-prefixed vars are skipped',
    run: async ({ mod, expect }) => {
      const migrateWebpackConfig = mod.migrateWebpackConfig as (w: WebpackConfig, envVars: string[]) => MigrationResult;
      const result = migrateWebpackConfig({}, ['API_URL', 'ANALYTICS_ID', 'VITE_ALREADY_OK']);
      expect(result.notes).to.have.lengthOf(2);
      expect(result.notes.some((n) => n.includes('VITE_API_URL'))).to.equal(true);
      expect(result.notes.some((n) => n.includes('VITE_ANALYTICS_ID'))).to.equal(true);
      expect(result.notes.some((n) => n.includes('VITE_VITE_ALREADY_OK'))).to.equal(false);
    },
  },
];
