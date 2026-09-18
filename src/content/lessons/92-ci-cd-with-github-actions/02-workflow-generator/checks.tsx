import type { Check } from '../../../types';

type BuildOptions = {
  packageManager: 'pnpm' | 'npm';
  nodeVersion: number;
  e2e?: { shards: number };
  deployPreview?: boolean;
  monorepoPaths?: string[];
};
type BuildFn = (opts: BuildOptions) => unknown;
type ToYamlFn = (value: unknown) => string;

function jobOrder(text: string): string[] {
  const idx = text.indexOf('\njobs:');
  const section = idx >= 0 ? text.slice(idx) : text;
  return [...section.matchAll(/^ {2}([\w-]+):$/gm)].map((m) => m[1] ?? '');
}

export const checks: Check[] = [
  {
    name: 'buildFrontendWorkflow (minimal: no e2e, no preview): only install-and-check and build jobs, needs chain, timeouts, and least-privilege permissions',
    run: async ({ mod, expect }) => {
      const buildFrontendWorkflow = mod.buildFrontendWorkflow as BuildFn;
      const toYaml = mod.toYaml as ToYamlFn;
      const text = toYaml(buildFrontendWorkflow({ packageManager: 'npm', nodeVersion: 20 }));

      expect(jobOrder(text)).to.deep.equal(['install-and-check', 'build']);
      expect(text.indexOf('install-and-check:')).to.be.lessThan(text.indexOf('build:'));
      expect(text).to.include('needs:');
      expect(text).to.include('- install-and-check');
      expect(text).to.match(/runs-on: ubuntu-24\.04/);
      expect((text.match(/timeout-minutes: \d+/g) ?? []).length).to.be.at.least(2);
      expect(text).to.include('contents: read');
      expect(text).not.to.include('pull-requests: write');
      expect(text).to.include('persist-credentials: false');
      expect(text).to.include('npm ci');
      expect(text).not.to.match(/^\s*run: npm install$/m);
      expect(text).not.to.include('pnpm/action-setup');
    },
  },
  {
    name: 'buildFrontendWorkflow (pnpm, e2e shards + preview + monorepoPaths): full job order, sharded matrix, matched artifact names, preview gating, and paths filter',
    run: async ({ mod, expect }) => {
      const buildFrontendWorkflow = mod.buildFrontendWorkflow as BuildFn;
      const toYaml = mod.toYaml as ToYamlFn;
      const text = toYaml(
        buildFrontendWorkflow({
          packageManager: 'pnpm',
          nodeVersion: 22,
          e2e: { shards: 3 },
          deployPreview: true,
          monorepoPaths: ['packages/web'],
        }),
      );

      expect(jobOrder(text)).to.deep.equal(['install-and-check', 'build', 'e2e', 'preview']);
      expect(text.indexOf('build:')).to.be.lessThan(text.indexOf('e2e:'));
      expect(text.indexOf('build:')).to.be.lessThan(text.indexOf('preview:'));

      const matrixSection = text.slice(text.indexOf('shard:'), text.indexOf('fail-fast:'));
      expect((matrixSection.match(/- \d+/g) ?? []).length).to.equal(3);
      expect(text).to.include("fail-fast: false");

      expect((text.match(/name: dist/g) ?? []).length).to.be.at.least(3);
      expect(text).to.include('if: failure()');

      expect(text).to.include('pull-requests: write');
      expect(text).to.include("if: github.event_name == 'pull_request'");
      expect(text).to.include('environment: preview');

      expect(text).to.include('paths:');
      expect(text).to.include('- packages/web');
      expect(text).to.include('pnpm/action-setup');
      expect(text).to.include('pnpm install --frozen-lockfile');
      expect(text).to.include("group: ci-${{ github.workflow }}-${{ github.ref }}");
      expect(text).to.include('cancel-in-progress: true');
    },
  },
  {
    name: 'toYaml: emits nested maps, arrays of scalars, arrays of step objects, booleans/numbers, and a multi-line run block via |',
    run: async ({ mod, expect }) => {
      const toYaml = mod.toYaml as ToYamlFn;
      const text = toYaml({
        name: 'Sample',
        on: { push: { branches: ['main', 'release'] } },
        jobs: {
          test: {
            'runs-on': 'ubuntu-24.04',
            'timeout-minutes': 5,
            steps: [
              { name: 'Multi', run: 'echo one\necho two' },
              { name: 'Flag', uses: 'actions/checkout@v7', with: { 'persist-credentials': false } },
            ],
          },
        },
      });

      expect(text).to.include('branches:');
      expect(text).to.include('- main');
      expect(text).to.include('- release');
      expect(text).to.include('timeout-minutes: 5');
      expect(text).to.include('run: |');
      expect(text).to.include('echo one');
      expect(text).to.include('echo two');
      expect(text.indexOf('run: |')).to.be.lessThan(text.indexOf('echo one'));
      expect(text.indexOf('echo one')).to.be.lessThan(text.indexOf('echo two'));
      expect(text).to.match(/^\s*- name: Multi$/m);
      expect(text).to.include('persist-credentials: false');
    },
  },
];
