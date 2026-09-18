export type NginxOptions = {
  spa: boolean;
  hashedAssetsPath: string;
  securityHeaders: boolean;
  compression: 'gzip' | 'none';
};

// TODO: return an nginx server{} config block as a string. See prompt.md.
export function generateNginxConf(opts: NginxOptions): string {
  return '';
}

export type EnvVar = { name: string; usedAt: 'build' | 'runtime'; secret: boolean };
export type EnvStrategy = 'VITE_public_build_arg' | 'runtime_window_env' | 'server_only_env' | 'reject_public_secret';
export type EnvResolution = { name: string; strategy: EnvStrategy; reason: string };

// TODO: classify each variable per the rules in prompt.md.
export function resolveEnvStrategy(vars: EnvVar[]): EnvResolution[] {
  return [];
}

const sampleConf = generateNginxConf({ spa: true, hashedAssetsPath: '/assets/', securityHeaders: true, compression: 'gzip' });
const sampleVars: EnvVar[] = [
  { name: 'VITE_API_URL', usedAt: 'build', secret: false },
  { name: 'VITE_STRIPE_SECRET', usedAt: 'build', secret: true },
  { name: 'DATABASE_URL', usedAt: 'runtime', secret: true },
  { name: 'FEATURE_FLAGS_ENDPOINT', usedAt: 'runtime', secret: false },
];
const resolutions = resolveEnvStrategy(sampleVars);

export default function App() {
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Generated nginx config</h2>
      <pre style={{ background: '#111', color: '#eee', padding: 12, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{sampleConf}</pre>
      <h3>Env variable strategy</h3>
      <ul>
        {resolutions.map((r) => (
          <li key={r.name}>
            <strong>{r.name}</strong>: {r.strategy} — {r.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
