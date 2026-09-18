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

// TODO: implement the six rules from prompt.md.
export function lintWorkflow(workflow: Workflow): Finding[] {
  return [];
}

// TODO: return a one-paragraph explanation for each FindingCode.
export function explainFinding(code: FindingCode): string {
  return '';
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
