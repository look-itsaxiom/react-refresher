import type { Check } from '../../../types';

type NginxOptions = {
  spa: boolean;
  hashedAssetsPath: string;
  securityHeaders: boolean;
  compression: 'gzip' | 'none';
};
type GenerateConfFn = (opts: NginxOptions) => string;

type EnvVar = { name: string; usedAt: 'build' | 'runtime'; secret: boolean };
type EnvResolution = { name: string; strategy: string; reason: string };
type ResolveFn = (vars: EnvVar[]) => EnvResolution[];

export const checks: Check[] = [
  {
    name: 'generateNginxConf: try_files falls back to index.html only when spa is true',
    run: async ({ mod, expect }) => {
      const generateNginxConf = mod.generateNginxConf as GenerateConfFn;
      const spaConf = generateNginxConf({ spa: true, hashedAssetsPath: '/assets/', securityHeaders: false, compression: 'none' });
      expect(spaConf).to.include('try_files $uri $uri/ /index.html;');

      const staticConf = generateNginxConf({ spa: false, hashedAssetsPath: '/assets/', securityHeaders: false, compression: 'none' });
      expect(staticConf).not.to.include('/index.html;');
      expect(staticConf).to.include('try_files $uri =404;');
    },
  },
  {
    name: 'generateNginxConf: always sets listen 8080, server_tokens off, immutable cache on hashed assets, and no-cache on index.html',
    run: async ({ mod, expect }) => {
      const generateNginxConf = mod.generateNginxConf as GenerateConfFn;
      const conf = generateNginxConf({ spa: true, hashedAssetsPath: '/static/', securityHeaders: false, compression: 'none' });
      expect(conf).to.include('listen 8080;');
      expect(conf).to.include('server_tokens off;');
      expect(conf).to.match(/location \/static\/ \{[^}]*immutable/s);
      expect(conf).to.match(/location = \/index\.html \{[^}]*no-cache/s);
    },
  },
  {
    name: 'generateNginxConf: securityHeaders and compression each add their own directives, and are absent when off',
    run: async ({ mod, expect }) => {
      const generateNginxConf = mod.generateNginxConf as GenerateConfFn;
      const on = generateNginxConf({ spa: true, hashedAssetsPath: '/assets/', securityHeaders: true, compression: 'gzip' });
      expect(on).to.include('X-Content-Type-Options');
      expect(on).to.include('gzip on;');

      const off = generateNginxConf({ spa: true, hashedAssetsPath: '/assets/', securityHeaders: false, compression: 'none' });
      expect(off).not.to.include('X-Content-Type-Options');
      expect(off).not.to.include('gzip on;');
    },
  },
  {
    name: 'resolveEnvStrategy: a secret named VITE_* is rejected, even though the caller marked it as build-time',
    run: async ({ mod, expect }) => {
      const resolveEnvStrategy = mod.resolveEnvStrategy as ResolveFn;
      const [result] = resolveEnvStrategy([{ name: 'VITE_STRIPE_SECRET', usedAt: 'build', secret: true }]);
      expect(result?.strategy).to.equal('reject_public_secret');
    },
  },
  {
    name: 'resolveEnvStrategy: a secret with a non-VITE name is server-only regardless of usedAt',
    run: async ({ mod, expect }) => {
      const resolveEnvStrategy = mod.resolveEnvStrategy as ResolveFn;
      const results = resolveEnvStrategy([
        { name: 'DATABASE_URL', usedAt: 'runtime', secret: true },
        { name: 'BUILD_SIGNING_KEY', usedAt: 'build', secret: true },
      ]);
      expect(results[0]?.strategy).to.equal('server_only_env');
      expect(results[1]?.strategy).to.equal('server_only_env');
    },
  },
  {
    name: 'resolveEnvStrategy: non-secret variables split on usedAt between the public build-arg and runtime-window strategies',
    run: async ({ mod, expect }) => {
      const resolveEnvStrategy = mod.resolveEnvStrategy as ResolveFn;
      const results = resolveEnvStrategy([
        { name: 'VITE_API_URL', usedAt: 'build', secret: false },
        { name: 'FEATURE_FLAGS_ENDPOINT', usedAt: 'runtime', secret: false },
      ]);
      expect(results[0]?.strategy).to.equal('VITE_public_build_arg');
      expect(results[1]?.strategy).to.equal('runtime_window_env');
    },
  },
];
