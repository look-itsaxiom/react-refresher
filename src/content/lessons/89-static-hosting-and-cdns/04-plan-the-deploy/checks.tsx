import type { Check } from '../../../types';

type Manifest = Record<string, string>;
type DeployPlan = { upload: string[]; unchanged: string[]; delete: string[]; purge: string[] };
type PreviewUrl = { host: string; path: string };
type PreviewOptions = { productionHosts: string[] };
type PreviewPolicy = { robots: 'index' | 'noindex'; requireAuth: boolean; headers: Record<string, string> };

type Mod = {
  planDeploy: (previous: Manifest, next: Manifest) => DeployPlan;
  previewPolicy: (url: PreviewUrl, options: PreviewOptions) => PreviewPolicy;
};

function sorted(arr: string[]): string[] {
  return [...arr].sort();
}

export const checks: Check[] = [
  {
    name: 'unchanged paths (same hash) are not queued for upload or purge',
    run: async ({ mod, expect }) => {
      const { planDeploy } = mod as unknown as Mod;
      const plan = planDeploy({ '/robots.txt': 'h3' }, { '/robots.txt': 'h3' });
      expect(plan.unchanged).to.deep.equal(['/robots.txt']);
      expect(plan.upload).to.deep.equal([]);
      expect(plan.purge).to.deep.equal([]);
    },
  },
  {
    name: 'a path missing from next but present in previous is queued for delete',
    run: async ({ mod, expect }) => {
      const { planDeploy } = mod as unknown as Mod;
      const plan = planDeploy({ '/old.html': 'h1', '/keep.html': 'h2' }, { '/keep.html': 'h2' });
      expect(plan.delete).to.deep.equal(['/old.html']);
    },
  },
  {
    name: 'a changed hashed asset is uploaded but never queued for purge',
    run: async ({ mod, expect }) => {
      const { planDeploy } = mod as unknown as Mod;
      const plan = planDeploy(
        { '/assets/app-a1b2c3d4.js': 'h1' },
        { '/assets/app-e5f6a7b8.js': 'h2' },
      );
      expect(sorted(plan.upload)).to.deep.equal(['/assets/app-e5f6a7b8.js']);
      expect(plan.purge, 'hashed filenames never need a purge').to.deep.equal([]);
    },
  },
  {
    name: 'a changed unhashed path is uploaded and queued for purge',
    run: async ({ mod, expect }) => {
      const { planDeploy } = mod as unknown as Mod;
      const plan = planDeploy({ '/index.html': 'h1' }, { '/index.html': 'h1x' });
      expect(plan.upload).to.deep.equal(['/index.html']);
      expect(plan.purge, 'an unhashed changed path needs an explicit purge').to.deep.equal(['/index.html']);
    },
  },
  {
    name: 'a mixed manifest sorts changed paths correctly between purge and no-purge',
    run: async ({ mod, expect }) => {
      const { planDeploy } = mod as unknown as Mod;
      const plan = planDeploy(
        { '/index.html': 'h1', '/assets/app-a1b2c3d4.js': 'h2', '/robots.txt': 'h3' },
        { '/index.html': 'h1x', '/assets/app-e5f6a7b8.js': 'h4', '/robots.txt': 'h3' },
      );
      expect(sorted(plan.upload)).to.deep.equal(['/assets/app-e5f6a7b8.js', '/index.html']);
      expect(plan.purge).to.deep.equal(['/index.html']);
      expect(plan.unchanged).to.deep.equal(['/robots.txt']);
      expect(plan.delete).to.deep.equal(['/assets/app-a1b2c3d4.js']);
    },
  },
  {
    name: 'a production host is indexed with no auth and no extra headers',
    run: async ({ mod, expect }) => {
      const { previewPolicy } = mod as unknown as Mod;
      const policy = previewPolicy({ host: 'myapp.com', path: '/' }, { productionHosts: ['myapp.com'] });
      expect(policy).to.deep.equal({ robots: 'index', requireAuth: false, headers: {} });
    },
  },
  {
    name: 'a deploy-preview host requires auth and is noindexed with the header',
    run: async ({ mod, expect }) => {
      const { previewPolicy } = mod as unknown as Mod;
      const policy = previewPolicy(
        { host: 'deploy-preview-42--myapp.netlify.app', path: '/' },
        { productionHosts: ['myapp.com'] },
      );
      expect(policy.robots).to.equal('noindex');
      expect(policy.requireAuth, 'a preview host must require auth').to.equal(true);
      expect(policy.headers['X-Robots-Tag']).to.equal('noindex');
    },
  },
];
