import type { Check } from '../../../types';

type Bump = 'patch' | 'minor' | 'major';
type Pkg = { version: string; dependencies: Record<string, string> };
type Graph = Record<string, Pkg>;
type ResolveFn = (
  dependencies: Record<string, string>,
  localVersions: Record<string, string>,
  catalog: Record<string, string>,
) => Record<string, string>;
type BumpFn = (changesets: Array<{ pkg: string; bump: Bump }>, graph: Graph) => Record<string, string>;

const chainGraph: Graph = {
  utils: { version: '0.3.0', dependencies: {} },
  ui: { version: '1.4.2', dependencies: { utils: 'workspace:*' } },
  app: { version: '2.0.0', dependencies: { ui: 'workspace:*' } },
  standalone: { version: '1.0.0', dependencies: {} },
};

export const checks: Check[] = [
  {
    name: 'resolveWorkspaceVersions: rewrites workspace:*, workspace:^, workspace:~, and an explicit workspace:<range> as pnpm does on publish',
    run: async ({ mod, expect }) => {
      const resolveWorkspaceVersions = mod.resolveWorkspaceVersions as ResolveFn;
      const result = resolveWorkspaceVersions(
        { ui: 'workspace:*', theme: 'workspace:^', tokens: 'workspace:~', charts: 'workspace:1.2.3' },
        { ui: '1.4.2', theme: '0.9.0', tokens: '2.0.0', charts: '1.2.3' },
        {},
      );
      expect(result).to.deep.equal({ ui: '1.4.2', theme: '^0.9.0', tokens: '~2.0.0', charts: '1.2.3' });
    },
  },
  {
    name: 'resolveWorkspaceVersions: rewrites bare and named catalog: entries, and leaves an ordinary range untouched',
    run: async ({ mod, expect }) => {
      const resolveWorkspaceVersions = mod.resolveWorkspaceVersions as ResolveFn;
      const result = resolveWorkspaceVersions(
        { react: 'catalog:', 'react-dom': 'catalog:react18', lodash: '^4.17.21' },
        {},
        { default: '^19.3.0', react18: '^18.3.0' },
      );
      expect(result).to.deep.equal({ react: '^19.3.0', 'react-dom': '^18.3.0', lodash: '^4.17.21' });
    },
  },
  {
    name: 'bumpChangesets: a package with a changeset is bumped to the requested level; the highest of multiple changesets for one package wins',
    run: async ({ mod, expect }) => {
      const bumpChangesets = mod.bumpChangesets as BumpFn;
      const result = bumpChangesets(
        [
          { pkg: 'utils', bump: 'patch' },
          { pkg: 'utils', bump: 'minor' },
        ],
        chainGraph,
      );
      expect(result.utils).to.equal('0.4.0');
      expect(result).to.not.have.property('standalone');
    },
  },
  {
    name: 'bumpChangesets: a bump cascades to every transitive dependent as at least a patch bump, without touching unrelated packages',
    run: async ({ mod, expect }) => {
      const bumpChangesets = mod.bumpChangesets as BumpFn;
      const result = bumpChangesets([{ pkg: 'utils', bump: 'minor' }], chainGraph);
      expect(result).to.deep.equal({ utils: '0.4.0', ui: '1.4.3', app: '2.0.1' });
    },
  },
  {
    name: "bumpChangesets: a dependent's own explicit changeset bump is never downgraded by the cascade's minimum-patch rule",
    run: async ({ mod, expect }) => {
      const bumpChangesets = mod.bumpChangesets as BumpFn;
      const result = bumpChangesets(
        [
          { pkg: 'utils', bump: 'patch' },
          { pkg: 'app', bump: 'major' },
        ],
        chainGraph,
      );
      expect(result.utils).to.equal('0.3.1');
      expect(result.ui).to.equal('1.4.3');
      expect(result.app).to.equal('3.0.0');
    },
  },
];
