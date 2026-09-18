export type Manifest = Record<string, string>; // path -> content hash

export type DeployPlan = {
  upload: string[];
  unchanged: string[];
  delete: string[];
  purge: string[];
};

export type PreviewUrl = { host: string; path: string };
export type PreviewOptions = { productionHosts: string[] };
export type PreviewPolicy = {
  robots: 'index' | 'noindex';
  requireAuth: boolean;
  headers: Record<string, string>;
};

const HASHED_SEGMENT = /[.-][a-f0-9]{8,}\./i;

/**
 * Compares the previous and next build manifests and returns what an
 * atomic deploy needs to do.
 */
export function planDeploy(previous: Manifest, next: Manifest): DeployPlan {
  const upload: string[] = [];
  const unchanged: string[] = [];
  const purge: string[] = [];

  for (const [path, hash] of Object.entries(next)) {
    if (previous[path] === hash) {
      unchanged.push(path);
    } else {
      upload.push(path);
      // BUG: every changed path is queued for purge, including hashed
      // assets. A hashed filename changes its URL whenever its content
      // changes, so the old cached copy is never requested again -- there
      // is nothing to purge. Only unhashed changed paths need this.
      purge.push(path);
    }
  }

  const del = Object.keys(previous).filter((path) => !(path in next));

  return { upload, unchanged, delete: del, purge };
}

/**
 * Decides the crawling/auth/header policy for a request, based on whether
 * its host is one of the site's production hosts.
 */
export function previewPolicy(url: PreviewUrl, options: PreviewOptions): PreviewPolicy {
  const isProduction = options.productionHosts.includes(url.host);

  // BUG: a non-production (preview) host must also require auth and carry
  // an X-Robots-Tag header -- this is the fix for "preview URL leaks."
  // Right now every host is treated as if it needs no auth and no header.
  return {
    robots: isProduction ? 'index' : 'noindex',
    requireAuth: false,
    headers: {},
  };
}

export default function App() {
  const plan = planDeploy(
    { '/index.html': 'h1', '/assets/app-a1b2c3d4.js': 'h2', '/robots.txt': 'h3' },
    { '/index.html': 'h1x', '/assets/app-e5f6a7b8.js': 'h4', '/robots.txt': 'h3' },
  );

  const policy = previewPolicy(
    { host: 'deploy-preview-42--myapp.netlify.app', path: '/' },
    { productionHosts: ['myapp.com'] },
  );

  return (
    <div>
      <p>upload: {plan.upload.join(', ')}</p>
      <p>purge: {plan.purge.join(', ')}</p>
      <p>
        robots: {policy.robots}, auth: {String(policy.requireAuth)}
      </p>
    </div>
  );
}
