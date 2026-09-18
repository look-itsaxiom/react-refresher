import type { Check } from '../../../types';

type Step = {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, string | number | boolean>;
};
type Job = {
  'runs-on': string;
  'timeout-minutes'?: number;
  permissions?: Record<string, string>;
  steps: Step[];
};
type Workflow = {
  name: string;
  on: Record<string, unknown>;
  permissions?: Record<string, string>;
  jobs: Record<string, Job>;
};
type Finding = { code: string; level: 'error' | 'warn' | 'info'; jobId: string; message: string };
type LintFn = (w: Workflow) => Finding[];
type ExplainFn = (code: string) => string;

const ALL_CODES = [
  'missing-permissions',
  'untrusted-checkout',
  'script-injection',
  'unpinned-action',
  'missing-timeout',
  'floating-runner',
];

const hostile: Workflow = {
  name: 'Hostile',
  on: { pull_request_target: {} },
  permissions: { contents: 'read' },
  jobs: {
    build: {
      'runs-on': 'ubuntu-latest',
      'timeout-minutes': 10,
      steps: [
        { name: 'Checkout PR head', uses: 'actions/checkout@v7', with: { ref: '${{ github.event.pull_request.head.sha }}' } },
        { name: 'Greet', run: 'echo "${{ github.event.pull_request.title }}"' },
        { name: 'Third-party action', uses: 'someorg/some-action@v1' },
      ],
    },
  },
};

// Well-formed-shaped workflow, using tags rather than SHA pins (as the previous
// exercise's generator does), a proper permissions block, a pinned-looking runner, and no
// dangerous checkout/interpolation pattern. Should trigger zero error-level findings.
const wellFormed: Workflow = {
  name: 'CI',
  on: { push: { branches: ['main'] }, pull_request: {} },
  permissions: { contents: 'read' },
  jobs: {
    'install-and-check': {
      'runs-on': 'ubuntu-24.04',
      'timeout-minutes': 10,
      steps: [
        { name: 'Checkout', uses: 'actions/checkout@v7', with: { 'persist-credentials': false } },
        { name: 'Setup Node', uses: 'actions/setup-node@v7', with: { 'node-version': 22 } },
        { name: 'Install', run: 'npm ci' },
      ],
    },
  },
};

export const checks: Check[] = [
  {
    name: 'lintWorkflow: the hostile fixture trips exactly these 4 distinct codes (untrusted-checkout, script-injection, unpinned-action, floating-runner) and not missing-permissions/missing-timeout',
    run: async ({ mod, expect }) => {
      const lintWorkflow = mod.lintWorkflow as LintFn;
      const findings = lintWorkflow(hostile);
      const codes = new Set(findings.map((f) => f.code));
      expect(codes.has('untrusted-checkout')).to.equal(true);
      expect(codes.has('script-injection')).to.equal(true);
      expect(codes.has('unpinned-action')).to.equal(true);
      expect(codes.has('floating-runner')).to.equal(true);
      expect(codes.has('missing-permissions')).to.equal(false);
      expect(codes.has('missing-timeout')).to.equal(false);
      expect(codes.size).to.equal(4);
      const errorFindings = findings.filter((f) => f.level === 'error');
      expect(errorFindings.map((f) => f.code).sort()).to.deep.equal(['script-injection', 'untrusted-checkout']);
    },
  },
  {
    name: 'lintWorkflow: a well-formed workflow (tag-pinned actions, explicit permissions, timeout, pinned runner, safe checkout) produces zero error-level findings',
    run: async ({ mod, expect }) => {
      const lintWorkflow = mod.lintWorkflow as LintFn;
      const findings = lintWorkflow(wellFormed);
      const errorFindings = findings.filter((f) => f.level === 'error');
      expect(errorFindings).to.deep.equal([]);
    },
  },
  {
    name: 'lintWorkflow: untrusted-checkout requires BOTH the pull_request_target trigger AND a checkout of the PR head — neither alone is enough',
    run: async ({ mod, expect }) => {
      const lintWorkflow = mod.lintWorkflow as LintFn;

      const triggerOnly: Workflow = {
        name: 'A',
        on: { pull_request_target: {} },
        permissions: { contents: 'read' },
        jobs: { build: { 'runs-on': 'ubuntu-24.04', 'timeout-minutes': 5, steps: [{ name: 'Checkout', uses: 'actions/checkout@v7' }] } },
      };
      expect(lintWorkflow(triggerOnly).some((f) => f.code === 'untrusted-checkout')).to.equal(false);

      const checkoutOnly: Workflow = {
        name: 'B',
        on: { pull_request: {} },
        permissions: { contents: 'read' },
        jobs: {
          build: {
            'runs-on': 'ubuntu-24.04',
            'timeout-minutes': 5,
            steps: [{ name: 'Checkout', uses: 'actions/checkout@v7', with: { ref: '${{ github.event.pull_request.head.sha }}' } }],
          },
        },
      };
      expect(lintWorkflow(checkoutOnly).some((f) => f.code === 'untrusted-checkout')).to.equal(false);
    },
  },
  {
    name: 'lintWorkflow: missing-permissions fires per job only when neither workflow-level nor that job\'s own permissions is set',
    run: async ({ mod, expect }) => {
      const lintWorkflow = mod.lintWorkflow as LintFn;

      const inherited: Workflow = {
        name: 'A',
        on: { push: {} },
        permissions: { contents: 'read' },
        jobs: { build: { 'runs-on': 'ubuntu-24.04', 'timeout-minutes': 5, steps: [] } },
      };
      expect(lintWorkflow(inherited).some((f) => f.code === 'missing-permissions')).to.equal(false);

      const ownJobPermissions: Workflow = {
        name: 'B',
        on: { push: {} },
        jobs: { build: { 'runs-on': 'ubuntu-24.04', 'timeout-minutes': 5, permissions: { contents: 'read' }, steps: [] } },
      };
      expect(lintWorkflow(ownJobPermissions).some((f) => f.code === 'missing-permissions')).to.equal(false);

      const neither: Workflow = {
        name: 'C',
        on: { push: {} },
        jobs: { build: { 'runs-on': 'ubuntu-24.04', 'timeout-minutes': 5, steps: [] } },
      };
      const found = lintWorkflow(neither).find((f) => f.code === 'missing-permissions');
      expect(found).to.not.equal(undefined);
      expect(found?.jobId).to.equal('build');
    },
  },
  {
    name: 'lintWorkflow: unpinned-action skips ./local and docker:// refs, and accepts a 40-hex-char SHA pin as clean',
    run: async ({ mod, expect }) => {
      const lintWorkflow = mod.lintWorkflow as LintFn;
      const w: Workflow = {
        name: 'A',
        on: { push: {} },
        permissions: { contents: 'read' },
        jobs: {
          build: {
            'runs-on': 'ubuntu-24.04',
            'timeout-minutes': 5,
            steps: [
              { name: 'Local', uses: './.github/actions/local-thing' },
              { name: 'Docker', uses: 'docker://alpine:3.20' },
              { name: 'Pinned', uses: 'actions/checkout@1e31de5234b9f8995739874a8ce0492dc87873e2' },
              { name: 'Unpinned', uses: 'actions/checkout@v7' },
            ],
          },
        },
      };
      const unpinnedFindings = lintWorkflow(w).filter((f) => f.code === 'unpinned-action');
      expect(unpinnedFindings).to.have.lengthOf(1);
    },
  },
  {
    name: 'explainFinding: returns a substantive, distinct paragraph for all 6 codes',
    run: async ({ mod, expect }) => {
      const explainFinding = mod.explainFinding as ExplainFn;
      const explanations = ALL_CODES.map((code) => explainFinding(code));
      for (const text of explanations) {
        expect(typeof text).to.equal('string');
        expect(text.length).to.be.at.least(60);
      }
      expect(new Set(explanations).size).to.equal(ALL_CODES.length);
    },
  },
];
