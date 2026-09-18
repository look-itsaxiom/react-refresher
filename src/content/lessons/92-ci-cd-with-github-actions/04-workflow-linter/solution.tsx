export type Permission = 'read' | 'write' | 'none';

export type Step = {
  name?: string;
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, string | number | boolean>;
  env?: Record<string, string>;
};

export type Job = {
  needs?: string[];
  'runs-on': string;
  'timeout-minutes'?: number;
  permissions?: Record<string, Permission>;
  steps: Step[];
};

export type Workflow = {
  name: string;
  on: Record<string, unknown>;
  permissions?: Record<string, Permission>;
  jobs: Record<string, Job>;
};

export type FindingLevel = 'error' | 'warn' | 'info';
export type FindingCode =
  | 'missing-permissions'
  | 'untrusted-checkout'
  | 'script-injection'
  | 'unpinned-action'
  | 'missing-timeout'
  | 'floating-runner';

export type Finding = {
  code: FindingCode;
  level: FindingLevel;
  jobId: string;
  message: string;
};

function isPinned(uses: string): boolean {
  return /@[0-9a-f]{40}$/.test(uses);
}

function isLocalOrDocker(uses: string): boolean {
  return uses.startsWith('./') || uses.startsWith('docker://');
}

const UNTRUSTED_REF = /github\.event\.pull_request\.head\.(sha|ref)/;
const EVENT_INTERP = /\$\{\{\s*github\.event\.[^}]+\}\}/;

export function lintWorkflow(workflow: Workflow): Finding[] {
  const findings: Finding[] = [];
  const isPullRequestTarget = 'pull_request_target' in workflow.on;

  for (const [jobId, job] of Object.entries(workflow.jobs)) {
    if (!workflow.permissions && !job.permissions) {
      findings.push({
        code: 'missing-permissions',
        level: 'warn',
        jobId,
        message: `Job "${jobId}" has no effective permissions (no workflow-level or job-level permissions block), so it runs with whatever the repository default grants.`,
      });
    }

    if (job['timeout-minutes'] === undefined) {
      findings.push({
        code: 'missing-timeout',
        level: 'info',
        jobId,
        message: `Job "${jobId}" has no timeout-minutes; a hang runs until the default job cap instead of failing fast.`,
      });
    }

    if (job['runs-on'].endsWith('-latest')) {
      findings.push({
        code: 'floating-runner',
        level: 'info',
        jobId,
        message: `Job "${jobId}" uses runs-on: ${job['runs-on']}, a moving target GitHub can repoint without notice.`,
      });
    }

    if (isPullRequestTarget) {
      const badCheckout = job.steps.find(
        (s) => s.uses?.includes('actions/checkout') && typeof s.with?.ref === 'string' && UNTRUSTED_REF.test(s.with.ref),
      );
      if (badCheckout) {
        findings.push({
          code: 'untrusted-checkout',
          level: 'error',
          jobId,
          message: `Job "${jobId}" runs on pull_request_target (which carries write-scoped secrets/tokens) and checks out the PR head commit directly, letting an attacker's code run with those privileges.`,
        });
      }
    }

    for (const step of job.steps) {
      if (step.uses && !isLocalOrDocker(step.uses) && !isPinned(step.uses)) {
        findings.push({
          code: 'unpinned-action',
          level: 'warn',
          jobId,
          message: `Step "${step.name ?? step.uses}" in job "${jobId}" uses "${step.uses}", which is not pinned to a commit SHA and can change underneath you if the tag or branch it points to moves.`,
        });
      }
      if (step.run && EVENT_INTERP.test(step.run)) {
        findings.push({
          code: 'script-injection',
          level: 'error',
          jobId,
          message: `Step "${step.name ?? 'run'}" in job "${jobId}" interpolates github.event.* directly into a shell command; pass it through env: instead so attacker-controlled text can't be executed as shell syntax.`,
        });
      }
    }
  }

  return findings;
}

const EXPLANATIONS: Record<FindingCode, string> = {
  'missing-permissions':
    'No workflow-level or job-level permissions block means the job runs with whatever GITHUB_TOKEN scope the repository (or organization) default grants, which can be broader than the job needs and can also change if that default is edited later. State permissions explicitly, scoped to what each job actually does, so the token a compromised dependency or malicious step could reach for is always least-privilege.',
  'untrusted-checkout':
    'pull_request_target runs with the base repository\'s permissions and secrets, even for a fork PR — that is its entire purpose, for workflows that need to comment or label with a token a plain pull_request run cannot get. Checking out the PR head commit inside that trigger hands an attacker-controlled commit the ability to run arbitrary code with those elevated privileges: a well-known remote-code-execution pattern. Either avoid checking out the fork\'s code in that trigger, or split the privileged step into a separate workflow gated behind review.',
  'script-injection':
    'Interpolating ${{ github.event.* }} (a PR title, branch name, commit message, or any other attacker-controlled field) directly into a run: string makes that text part of the shell command, not just its argument. A PR titled with a shell metacharacter sequence can execute arbitrary commands in the runner. The fix is to pass the value through env: and reference the environment variable from the shell instead, which keeps it as data.',
  'unpinned-action':
    'An action referenced by a tag or branch (like @v7 or @main) can change what code actually runs without your workflow file changing at all, if the upstream repository moves that ref — either intentionally or because the account got compromised. Pinning to an immutable 40-character commit SHA guarantees the code that ran in review is the code that runs in CI, and Dependabot/Renovate can still open PRs to bump the pinned SHA when you want to update.',
  'missing-timeout':
    'Without timeout-minutes, a hung step (a dev server that never becomes ready, a deadlocked test) runs until the platform default job cap instead of failing fast, wasting runner minutes and delaying feedback on unrelated PRs queued behind it.',
  'floating-runner':
    'runs-on: ubuntu-latest (or any -latest label) is a moving target that GitHub repoints to a new image on its own schedule; a workflow that silently starts running on a different base OS image can break without any change to your own files. Pinning to a specific image (ubuntu-24.04) makes upgrades a deliberate, reviewable choice instead of something that happens to you.',
};

export function explainFinding(code: FindingCode): string {
  return EXPLANATIONS[code];
}

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

const clean: Workflow = {
  name: 'Clean',
  on: { push: { branches: ['main'] } },
  permissions: { contents: 'read' },
  jobs: {
    build: {
      'runs-on': 'ubuntu-24.04',
      'timeout-minutes': 10,
      steps: [{ name: 'Checkout', uses: 'actions/checkout@1e31de5234b9f8995739874a8ce0492dc87873e2' }],
    },
  },
};

export default function App() {
  const hostileFindings = lintWorkflow(hostile);
  const cleanFindings = lintWorkflow(clean);
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Hostile workflow findings</h2>
      <ul>
        {hostileFindings.map((f, i) => (
          <li key={i}>
            [{f.level}] {f.code} ({f.jobId}): {f.message}
          </li>
        ))}
      </ul>
      <h2>Clean workflow findings</h2>
      <ul>
        {cleanFindings.map((f, i) => (
          <li key={i}>
            [{f.level}] {f.code} ({f.jobId}): {f.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
