import type { Check } from '../../../types';

type DockerfileOptions = {
  kind: 'spa' | 'ssr';
  packageManager: 'pnpm' | 'npm';
  nodeVersion: number;
  monorepoFilter?: string;
  nonRoot?: boolean;
  healthcheckPath?: string;
};
type GenerateFn = (opts: DockerfileOptions) => string;
type LintFn = (text: string) => string[];

function stageOrder(text: string): string[] {
  return [...text.matchAll(/^FROM\s+\S+\s+AS\s+(\w+)/gm)].map((m) => m[1] ?? '');
}

const badFixture = [
  'FROM node:20-slim',
  'WORKDIR /app',
  'COPY . .',
  'RUN pnpm install --frozen-lockfile',
  'RUN pnpm build',
  '',
  'FROM nginx:latest',
  'COPY --from=build /app/dist /usr/share/nginx/html',
  'CMD npm start',
].join('\n');

export const checks: Check[] = [
  {
    name: 'generateDockerfile (spa/pnpm): stages are ordered deps -> build -> runner, install is lockfile-first, and CMD is exec-form nginx',
    run: async ({ mod, expect }) => {
      const generateDockerfile = mod.generateDockerfile as GenerateFn;
      const text = generateDockerfile({ kind: 'spa', packageManager: 'pnpm', nodeVersion: 22 });
      expect(stageOrder(text)).to.deep.equal(['deps', 'build', 'runner']);
      expect(text).to.include('corepack enable');
      expect(text.indexOf('pnpm-lock.yaml')).to.be.lessThan(text.indexOf('pnpm install --frozen-lockfile'));
      expect(text.indexOf('pnpm install --frozen-lockfile')).to.be.lessThan(text.indexOf('COPY . .'));
      expect(text).to.match(/FROM\s+nginxinc\/nginx-unprivileged/);
      expect(text).to.include('EXPOSE 8080');
      expect(text).to.match(/^CMD \["nginx".*\]$/m);
      expect(text).not.to.include('HEALTHCHECK');
    },
  },
  {
    name: 'generateDockerfile (ssr/npm, nonRoot, healthcheckPath): npm ci (not install), USER node, HEALTHCHECK with the path, exec-form node CMD',
    run: async ({ mod, expect }) => {
      const generateDockerfile = mod.generateDockerfile as GenerateFn;
      const text = generateDockerfile({
        kind: 'ssr',
        packageManager: 'npm',
        nodeVersion: 20,
        nonRoot: true,
        healthcheckPath: '/healthz',
      });
      expect(stageOrder(text)).to.deep.equal(['deps', 'build', 'runner']);
      expect(text).to.include('npm ci');
      expect(text).not.to.match(/^RUN npm install$/m);
      expect(text).to.include('USER node');
      expect(text).to.include('HEALTHCHECK');
      expect(text).to.include('/healthz');
      expect(text).to.match(/^CMD \["node".*\]$/m);
      expect(text).to.include('node:20-slim');
    },
  },
  {
    name: 'generateDockerfile: monorepoFilter scopes the build command, and omitting healthcheckPath omits HEALTHCHECK',
    run: async ({ mod, expect }) => {
      const generateDockerfile = mod.generateDockerfile as GenerateFn;
      const filtered = generateDockerfile({ kind: 'ssr', packageManager: 'pnpm', nodeVersion: 22, monorepoFilter: 'web' });
      expect(filtered).to.include('web');
      expect(filtered).to.match(/pnpm.*--filter.*web.*build|pnpm.*build.*--filter.*web/);
      expect(filtered).not.to.include('HEALTHCHECK');

      const unfiltered = generateDockerfile({ kind: 'spa', packageManager: 'npm', nodeVersion: 22 });
      expect(unfiltered).not.to.include('HEALTHCHECK');
    },
  },
  {
    name: 'lintDockerfile: flags a Dockerfile with COPY . . before install, shell-form CMD, no USER, and a :latest tag (exactly 4 findings)',
    run: async ({ mod, expect }) => {
      const lintDockerfile = mod.lintDockerfile as LintFn;
      const findings = lintDockerfile(badFixture);
      expect(findings).to.have.lengthOf(4);
    },
  },
  {
    name: 'lintDockerfile: a generateDockerfile output (ssr, nonRoot, npm) does not trip its own linter',
    run: async ({ mod, expect }) => {
      const generateDockerfile = mod.generateDockerfile as GenerateFn;
      const lintDockerfile = mod.lintDockerfile as LintFn;
      const text = generateDockerfile({ kind: 'ssr', packageManager: 'npm', nodeVersion: 22, nonRoot: true });
      expect(lintDockerfile(text)).to.deep.equal([]);
    },
  },
  {
    name: 'lintDockerfile: detects a bare npm install and a secret-looking ENV independently of the other anti-patterns',
    run: async ({ mod, expect }) => {
      const lintDockerfile = mod.lintDockerfile as LintFn;
      const snippet = [
        'FROM node:22-slim AS deps',
        'WORKDIR /app',
        'COPY package.json package-lock.json ./',
        'RUN npm install',
        'ENV STRIPE_SECRET_KEY=sk_live_abc123',
        'USER node',
        'CMD ["node", "dist/server.js"]',
      ].join('\n');
      const findings = lintDockerfile(snippet);
      expect(findings).to.have.lengthOf(2);
    },
  },
];
