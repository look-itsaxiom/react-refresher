import type { Check } from '../../../types';

type RedirectStatus = 301 | 302 | 308 | 200;
type RedirectRule = { from: string; to: string; status?: RedirectStatus; force?: boolean };
type HeaderRule = { for: string; values: Record<string, string> };
type HostConfig = {
  files: string[];
  redirects: RedirectRule[];
  headers: HeaderRule[];
  spaFallback?: boolean;
  trailingSlash?: 'add' | 'remove' | 'keep';
};
type HostRequest = { path: string };
type HostResponse = { status: number; path?: string; location?: string; headers: Record<string, string> };

type Mod = {
  resolveRequest: (config: HostConfig, request: HostRequest) => HostResponse;
};

const baseConfig: HostConfig = {
  files: ['/index.html', '/assets/app-3f9c2a1b.js', '/about/index.html'],
  redirects: [],
  headers: [],
};

export const checks: Check[] = [
  {
    name: 'an exact file match is served with the hashed-asset cache header',
    run: async ({ mod, expect }) => {
      const { resolveRequest } = mod as unknown as Mod;
      const result = resolveRequest(baseConfig, { path: '/assets/app-3f9c2a1b.js' });
      expect(result.status).to.equal(200);
      expect(result.path).to.equal('/assets/app-3f9c2a1b.js');
      expect(result.headers['Cache-Control']).to.equal('public, max-age=31536000, immutable');
    },
  },
  {
    name: 'an unhashed HTML entry point gets the revalidate-on-every-load header',
    run: async ({ mod, expect }) => {
      const { resolveRequest } = mod as unknown as Mod;
      const result = resolveRequest(baseConfig, { path: '/index.html' });
      expect(result.headers['Cache-Control']).to.equal('public, max-age=0, must-revalidate');
    },
  },
  {
    name: 'a directory path resolves to its index.html',
    run: async ({ mod, expect }) => {
      const { resolveRequest } = mod as unknown as Mod;
      const result = resolveRequest(baseConfig, { path: '/about' });
      expect(result.status).to.equal(200);
      expect(result.path).to.equal('/about/index.html');
    },
  },
  {
    name: 'a forced redirect wins even when a file exists at that exact path',
    run: async ({ mod, expect }) => {
      const { resolveRequest } = mod as unknown as Mod;
      const config: HostConfig = {
        ...baseConfig,
        redirects: [{ from: '/index.html', to: '/about/index.html', status: 200, force: true }],
      };
      const result = resolveRequest(config, { path: '/index.html' });
      expect(result.status, 'a force redirect must override the real file at this path').to.equal(200);
      expect(result.path).to.equal('/about/index.html');
    },
  },
  {
    name: 'a non-forced redirect is ignored when a real file already matches',
    run: async ({ mod, expect }) => {
      const { resolveRequest } = mod as unknown as Mod;
      const config: HostConfig = {
        ...baseConfig,
        redirects: [{ from: '/index.html', to: '/about/index.html', status: 200 }],
      };
      const result = resolveRequest(config, { path: '/index.html' });
      expect(result.status).to.equal(200);
      expect(result.path, 'the real file should win over a non-forced redirect').to.equal('/index.html');
    },
  },
  {
    name: 'a splat redirect rewrites the path using the captured remainder',
    run: async ({ mod, expect }) => {
      const { resolveRequest } = mod as unknown as Mod;
      const config: HostConfig = {
        ...baseConfig,
        files: [...baseConfig.files, '/posts/2024/hello.html'],
        redirects: [{ from: '/blog/*', to: '/posts/:splat', status: 200 }],
      };
      const result = resolveRequest(config, { path: '/blog/2024/hello.html' });
      expect(result.status).to.equal(200);
      expect(result.path).to.equal('/posts/2024/hello.html');
    },
  },
  {
    name: 'trailing-slash "remove" issues a 308 to the slash-free path',
    run: async ({ mod, expect }) => {
      const { resolveRequest } = mod as unknown as Mod;
      const config: HostConfig = { ...baseConfig, trailingSlash: 'remove' };
      const result = resolveRequest(config, { path: '/about/' });
      expect(result.status).to.equal(308);
      expect(result.location).to.equal('/about');
    },
  },
  {
    name: 'header rules merge in order, later rule wins, on top of the default cache header',
    run: async ({ mod, expect }) => {
      const { resolveRequest } = mod as unknown as Mod;
      const config: HostConfig = {
        ...baseConfig,
        headers: [
          { for: '/assets/*', values: { 'X-Content-Type-Options': 'nosniff' } },
          { for: '/assets/*', values: { 'Cache-Control': 'public, max-age=60' } },
        ],
      };
      const result = resolveRequest(config, { path: '/assets/app-3f9c2a1b.js' });
      expect(result.headers['X-Content-Type-Options']).to.equal('nosniff');
      expect(result.headers['Cache-Control'], 'the later header rule should override the default cache header').to.equal(
        'public, max-age=60',
      );
    },
  },
  {
    name: 'spaFallback serves index.html with 200 for an unmatched extensionless path',
    run: async ({ mod, expect }) => {
      const { resolveRequest } = mod as unknown as Mod;
      const config: HostConfig = { ...baseConfig, spaFallback: true };
      const result = resolveRequest(config, { path: '/settings' });
      expect(result.status).to.equal(200);
      expect(result.path).to.equal('/index.html');
    },
  },
  {
    name: 'an unmatched path with a file extension is a real 404, even with spaFallback on',
    run: async ({ mod, expect }) => {
      const { resolveRequest } = mod as unknown as Mod;
      const config: HostConfig = { ...baseConfig, spaFallback: true };
      const result = resolveRequest(config, { path: '/missing.png' });
      expect(result.status).to.equal(404);
    },
  },
  {
    name: 'without spaFallback, an unmatched extensionless path is a 404',
    run: async ({ mod, expect }) => {
      const { resolveRequest } = mod as unknown as Mod;
      const result = resolveRequest(baseConfig, { path: '/settings' });
      expect(result.status).to.equal(404);
    },
  },
];
