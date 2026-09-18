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

// TODO: build the Workflow object described in prompt.md.
export function buildFrontendWorkflow(opts: BuildOptions): Workflow {
  return {
    name: 'CI',
    on: {},
    jobs: {},
  };
}

// TODO: serialize a Workflow (or any plain JSON-ish value) to YAML text. See prompt.md
// for the emitter rules: scalars, arrays, nested maps, and multi-line `run` via `|`.
export function toYaml(value: unknown): string {
  return '';
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
