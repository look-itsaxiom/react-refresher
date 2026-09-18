export type NginxOptions = {
  spa: boolean;
  hashedAssetsPath: string;
  securityHeaders: boolean;
  compression: 'gzip' | 'none';
};

export function generateNginxConf(opts: NginxOptions): string {
  const lines: string[] = [];
  lines.push('server {');
  lines.push('    listen 8080;');
  lines.push('    server_tokens off;');
  lines.push('    root /usr/share/nginx/html;');
  lines.push('');
  lines.push(`    location ${opts.hashedAssetsPath} {`);
  lines.push('        add_header Cache-Control "public, max-age=31536000, immutable";');
  lines.push('    }');
  lines.push('');
  lines.push('    location = /index.html {');
  lines.push('        add_header Cache-Control "no-cache";');
  lines.push('    }');
  lines.push('');
  lines.push('    location / {');
  if (opts.spa) {
    lines.push('        try_files $uri $uri/ /index.html;');
  } else {
    lines.push('        try_files $uri =404;');
  }
  lines.push('    }');

  if (opts.securityHeaders) {
    lines.push('');
    lines.push('    add_header X-Content-Type-Options "nosniff";');
    lines.push('    add_header Referrer-Policy "no-referrer-when-downgrade";');
    lines.push('    add_header Content-Security-Policy "default-src \'self\'"; # placeholder: tighten per app');
  }

  if (opts.compression === 'gzip') {
    lines.push('');
    lines.push('    gzip on;');
    lines.push('    gzip_types text/css application/javascript application/json image/svg+xml;');
    lines.push('    gzip_min_length 1024;');
  }

  lines.push('}');
  return lines.join('\n');
}

export type EnvVar = { name: string; usedAt: 'build' | 'runtime'; secret: boolean };
export type EnvStrategy = 'VITE_public_build_arg' | 'runtime_window_env' | 'server_only_env' | 'reject_public_secret';
export type EnvResolution = { name: string; strategy: EnvStrategy; reason: string };

export function resolveEnvStrategy(vars: EnvVar[]): EnvResolution[] {
  return vars.map((v) => {
    if (v.secret && v.name.startsWith('VITE_')) {
      return {
        name: v.name,
        strategy: 'reject_public_secret' as const,
        reason: 'VITE_-prefixed variables are inlined into the client bundle at build time, so a secret can never use that prefix.',
      };
    }
    if (v.secret) {
      return {
        name: v.name,
        strategy: 'server_only_env' as const,
        reason: 'Secrets must never reach the client bundle; inject as a plain environment variable read only by server-side code.',
      };
    }
    if (v.usedAt === 'build') {
      return {
        name: v.name,
        strategy: 'VITE_public_build_arg' as const,
        reason: 'Non-secret values needed at build time are baked into the bundle via a VITE_-prefixed variable.',
      };
    }
    return {
      name: v.name,
      strategy: 'runtime_window_env' as const,
      reason: 'Non-secret values needed at runtime are injected at container start so the same image works across environments without a rebuild.',
    };
  });
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
