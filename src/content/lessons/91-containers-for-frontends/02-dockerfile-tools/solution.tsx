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

function installLines(opts: DockerfileOptions): string[] {
  if (opts.packageManager === 'pnpm') {
    return [
      'RUN corepack enable',
      'COPY package.json pnpm-lock.yaml ./',
      'RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile',
    ];
  }
  return ['COPY package.json package-lock.json ./', 'RUN npm ci'];
}

function buildLine(opts: DockerfileOptions): string {
  if (opts.packageManager === 'pnpm' && opts.monorepoFilter) {
    return `RUN pnpm --filter ${opts.monorepoFilter} build`;
  }
  if (opts.packageManager === 'pnpm') return 'RUN pnpm build';
  return 'RUN npm run build';
}

export function generateDockerfile(opts: DockerfileOptions): string {
  const lines: string[] = [];

  lines.push('# syntax=docker/dockerfile:1');
  lines.push(`FROM node:${opts.nodeVersion}-slim AS deps`);
  lines.push('WORKDIR /app');
  lines.push(...installLines(opts));
  lines.push('');

  lines.push('FROM deps AS build');
  lines.push('COPY . .');
  lines.push(buildLine(opts));
  lines.push('');

  if (opts.kind === 'spa') {
    lines.push('FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner');
    lines.push('COPY --from=build /app/dist /usr/share/nginx/html');
    lines.push('COPY nginx.conf /etc/nginx/conf.d/default.conf');
    lines.push('EXPOSE 8080');
    if (opts.healthcheckPath) {
      lines.push(`HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8080${opts.healthcheckPath} || exit 1`);
    }
    lines.push('CMD ["nginx", "-g", "daemon off;"]');
  } else {
    lines.push(`FROM node:${opts.nodeVersion}-slim AS runner`);
    lines.push('WORKDIR /app');
    lines.push('ENV NODE_ENV=production');
    lines.push('COPY --from=build /app/dist ./dist');
    lines.push('COPY --from=build /app/node_modules ./node_modules');
    lines.push('COPY --from=build /app/package.json ./package.json');
    if (opts.nonRoot) lines.push('USER node');
    lines.push('EXPOSE 3000');
    if (opts.healthcheckPath) {
      lines.push(
        `HEALTHCHECK --interval=30s --timeout=3s CMD node -e "require('http').get('http://localhost:3000${opts.healthcheckPath}',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"`,
      );
    }
    lines.push('CMD ["node", "dist/server.js"]');
  }

  return lines.join('\n');
}

export function lintDockerfile(text: string): string[] {
  const lines = text.split('\n');
  const findings: string[] = [];

  let sawInstall = false;
  let copyAllBeforeInstall = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^RUN\s+(npm ci|npm install|pnpm install|pnpm fetch|yarn install)/.test(line)) {
      sawInstall = true;
    }
    if (line === 'COPY . .' && !sawInstall) {
      copyAllBeforeInstall = true;
    }
  }
  if (copyAllBeforeInstall) {
    findings.push('COPY . . appears before the dependency install, so any source change invalidates the install layer cache.');
  }

  const cmdLine = lines.map((l) => l.trim()).find((l) => l.startsWith('CMD '));
  if (cmdLine && !cmdLine.startsWith('CMD [')) {
    findings.push('CMD uses shell form, so the app never receives SIGTERM directly and container stop waits for the kill timeout.');
  }

  if (!lines.some((l) => l.trim().startsWith('USER '))) {
    findings.push('No USER instruction: the container runs as root.');
  }

  if (/FROM\s+\S+:latest\b/.test(text)) {
    findings.push('A base image is pinned to :latest, which is not reproducible across builds.');
  }

  if (lines.some((l) => l.trim() === 'RUN npm install')) {
    findings.push('Uses npm install instead of npm ci, so installs can drift from the committed lockfile.');
  }

  if (/^\s*ENV\s+\w*(SECRET|TOKEN|PASSWORD|API_KEY)\w*\s*=/im.test(text)) {
    findings.push('Sets what looks like a secret via ENV, which bakes the value into the image history and layers.');
  }

  return findings;
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
