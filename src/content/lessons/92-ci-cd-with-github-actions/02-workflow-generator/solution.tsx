export type PackageManager = 'pnpm' | 'npm';

export type BuildOptions = {
  packageManager: PackageManager;
  nodeVersion: number;
  e2e?: { shards: number };
  deployPreview?: boolean;
  monorepoPaths?: string[];
};

export type Permission = 'read' | 'write' | 'none';

export type Step = {
  name?: string;
  id?: string;
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, string | number | boolean>;
  env?: Record<string, string>;
};

export type Job = {
  needs?: string[];
  if?: string;
  environment?: string;
  'runs-on': string;
  'timeout-minutes': number;
  permissions?: Record<string, Permission>;
  strategy?: { matrix: Record<string, Array<string | number>>; 'fail-fast'?: boolean };
  steps: Step[];
};

export type Workflow = {
  name: string;
  on: Record<string, unknown>;
  concurrency?: { group: string; 'cancel-in-progress': boolean };
  permissions?: Record<string, Permission>;
  jobs: Record<string, Job>;
};

function checkoutStep(): Step {
  return { name: 'Checkout', uses: 'actions/checkout@v7', with: { 'persist-credentials': false } };
}

function setupSteps(opts: BuildOptions): Step[] {
  const steps: Step[] = [];
  if (opts.packageManager === 'pnpm') {
    steps.push({ name: 'Setup pnpm', uses: 'pnpm/action-setup@v4' });
  }
  steps.push({
    name: 'Setup Node',
    uses: 'actions/setup-node@v7',
    with: { 'node-version': opts.nodeVersion, cache: opts.packageManager },
  });
  steps.push({
    name: 'Install dependencies',
    run: opts.packageManager === 'pnpm' ? 'pnpm install --frozen-lockfile' : 'npm ci',
  });
  return steps;
}

function run(opts: BuildOptions, script: string): string {
  return opts.packageManager === 'pnpm' ? `pnpm ${script}` : `npm run ${script}`;
}

function installAndCheckJob(opts: BuildOptions): Job {
  return {
    'runs-on': 'ubuntu-24.04',
    'timeout-minutes': 10,
    steps: [
      checkoutStep(),
      ...setupSteps(opts),
      { name: 'Typecheck', run: run(opts, 'typecheck') },
      { name: 'Lint', run: run(opts, 'lint') },
      { name: 'Unit tests', run: opts.packageManager === 'pnpm' ? 'pnpm test' : 'npm test' },
    ],
  };
}

function buildJob(opts: BuildOptions): Job {
  return {
    needs: ['install-and-check'],
    'runs-on': 'ubuntu-24.04',
    'timeout-minutes': 10,
    steps: [
      checkoutStep(),
      ...setupSteps(opts),
      { name: 'Build', run: run(opts, 'build') },
      { name: 'Upload dist', uses: 'actions/upload-artifact@v7', with: { name: 'dist', path: 'dist', 'retention-days': 7 } },
    ],
  };
}

function e2eJob(opts: BuildOptions, shards: number): Job {
  return {
    needs: ['build'],
    'runs-on': 'ubuntu-24.04',
    'timeout-minutes': 15,
    strategy: { matrix: { shard: Array.from({ length: shards }, (_, i) => i + 1) }, 'fail-fast': false },
    steps: [
      checkoutStep(),
      ...setupSteps(opts),
      { name: 'Download dist', uses: 'actions/download-artifact@v7', with: { name: 'dist', path: 'dist' } },
      { name: 'Install browsers', run: 'npx playwright install --with-deps' },
      { name: 'Run e2e shard', run: 'npx playwright test --shard=${{ matrix.shard }}/${{ strategy.job-total }}' },
      {
        name: 'Upload traces',
        if: 'failure()',
        uses: 'actions/upload-artifact@v7',
        with: { name: 'e2e-traces-${{ matrix.shard }}', path: 'test-results', 'retention-days': 7 },
      },
    ],
  };
}

function previewJob(): Job {
  return {
    needs: ['build'],
    if: "github.event_name == 'pull_request'",
    environment: 'preview',
    'runs-on': 'ubuntu-24.04',
    'timeout-minutes': 10,
    steps: [
      { name: 'Download dist', uses: 'actions/download-artifact@v7', with: { name: 'dist', path: 'dist' } },
      { name: 'Deploy preview', id: 'deploy', run: 'npx wrangler pages deploy dist' },
      { name: 'Comment preview URL', uses: 'actions/github-script@v8', with: { script: 'console.log("preview deployed")' } },
    ],
  };
}

export function buildFrontendWorkflow(opts: BuildOptions): Workflow {
  const jobs: Record<string, Job> = {
    'install-and-check': installAndCheckJob(opts),
    build: buildJob(opts),
  };
  if (opts.e2e) jobs.e2e = e2eJob(opts, opts.e2e.shards);
  if (opts.deployPreview) jobs.preview = previewJob();

  const pullRequest: Record<string, unknown> = {};
  if (opts.monorepoPaths) pullRequest.paths = opts.monorepoPaths;

  return {
    name: 'CI',
    on: { push: { branches: ['main'] }, pull_request: pullRequest },
    concurrency: { group: 'ci-${{ github.workflow }}-${{ github.ref }}', 'cancel-in-progress': true },
    permissions: opts.deployPreview ? { contents: 'read', 'pull-requests': 'write' } : { contents: 'read' },
    jobs,
  };
}

// --- YAML emitter ---

type JsonVal = string | number | boolean | null | JsonVal[] | { [key: string]: JsonVal | undefined };

function pad(indent: number): string {
  return '  '.repeat(indent);
}

function scalarStr(v: string | number | boolean | null): string {
  if (v === null) return 'null';
  if (typeof v !== 'string') return String(v);
  if (v === '') return "''";
  const needsQuote =
    /^\s|\s$/.test(v) ||
    /^(true|false|null|~|yes|no)$/i.test(v) ||
    /^-?\d+(\.\d+)?$/.test(v) ||
    /^[-?:,[\]{}#&*!|>'"%@`]/.test(v) ||
    /: |:$/.test(v);
  if (!needsQuote) return v;
  return `'${v.replace(/'/g, "''")}'`;
}

function emitEntry(key: string, value: JsonVal | undefined, indent: number, out: string[], firstInListItem: boolean): void {
  if (value === undefined) return;
  const linePad = firstInListItem ? pad(indent).slice(0, -2) + '- ' : pad(indent);

  if (typeof value === 'string' && value.includes('\n')) {
    out.push(`${linePad}${key}: |`);
    for (const line of value.split('\n')) out.push(`${pad(indent + 1)}${line}`);
    return;
  }
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    out.push(`${linePad}${key}: ${scalarStr(value)}`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      out.push(`${linePad}${key}: []`);
      return;
    }
    out.push(`${linePad}${key}:`);
    emitArrayItems(value, indent + 1, out);
    return;
  }
  const keys = Object.keys(value).filter((k) => value[k] !== undefined);
  if (keys.length === 0) {
    out.push(`${linePad}${key}: {}`);
    return;
  }
  out.push(`${linePad}${key}:`);
  emitMap(value, indent + 1, out);
}

function emitArrayItems(items: JsonVal[], indent: number, out: string[]): void {
  for (const item of items) {
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      emitMapAsListItem(item, indent, out);
    } else {
      out.push(`${pad(indent)}- ${scalarStr(item as string | number | boolean | null)}`);
    }
  }
}

function emitMap(obj: Record<string, JsonVal | undefined>, indent: number, out: string[]): void {
  for (const [key, value] of Object.entries(obj)) {
    emitEntry(key, value, indent, out, false);
  }
}

function emitMapAsListItem(obj: Record<string, JsonVal | undefined>, indent: number, out: string[]): void {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  entries.forEach(([key, value], i) => {
    emitEntry(key, value, indent, out, i === 0);
  });
}

export function toYaml(value: unknown): string {
  const out: string[] = [];
  emitMap(value as Record<string, JsonVal | undefined>, 0, out);
  return out.join('\n');
}

const sample = buildFrontendWorkflow({
  packageManager: 'pnpm',
  nodeVersion: 22,
  e2e: { shards: 3 },
  deployPreview: true,
  monorepoPaths: ['packages/web'],
});
const yaml = toYaml(sample);

export default function App() {
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Generated workflow</h2>
      <pre style={{ background: '#111', color: '#eee', padding: 12, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{yaml}</pre>
    </div>
  );
}
