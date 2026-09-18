export type PackageManager = 'pnpm' | 'npm';
export type DockerfileKind = 'spa' | 'ssr';

export type DockerfileOptions = {
  kind: DockerfileKind;
  packageManager: PackageManager;
  nodeVersion: number;
  monorepoFilter?: string;
  nonRoot?: boolean;
  healthcheckPath?: string;
};

// TODO: return a full multi-stage Dockerfile as a string. See prompt.md for the exact
// shape: named stages deps -> build -> runner, lockfile-first installs, exec-form CMD,
// and a runner that differs by `kind`.
export function generateDockerfile(opts: DockerfileOptions): string {
  return '';
}

// TODO: return an array of finding strings for the six documented anti-patterns.
// An empty array means the Dockerfile is clean.
export function lintDockerfile(text: string): string[] {
  return [];
}

const sample = generateDockerfile({
  kind: 'ssr',
  packageManager: 'pnpm',
  nodeVersion: 24,
  nonRoot: true,
  healthcheckPath: '/healthz',
});
const findings = lintDockerfile(sample);

export default function App() {
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Generated Dockerfile (SSR)</h2>
      <pre style={{ background: '#111', color: '#eee', padding: 12, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{sample}</pre>
      <h3>Lint findings</h3>
      {findings.length === 0 ? (
        <p>No issues found.</p>
      ) : (
        <ul>
          {findings.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
