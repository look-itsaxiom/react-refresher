export type RedirectStatus = 301 | 302 | 308 | 200;

export type RedirectRule = {
  from: string;
  to: string;
  status?: RedirectStatus;
  force?: boolean;
};

export type HeaderRule = {
  for: string;
  values: Record<string, string>;
};

export type HostConfig = {
  /** Deployed paths, e.g. '/index.html', '/assets/app-3f9c2a1b.js'. */
  files: string[];
  redirects: RedirectRule[];
  headers: HeaderRule[];
  spaFallback?: boolean;
  trailingSlash?: 'add' | 'remove' | 'keep';
};

export type HostRequest = { path: string };

export type HostResponse = {
  status: number;
  path?: string;
  location?: string;
  headers: Record<string, string>;
};

type GlobMatch = { matched: boolean; splat?: string; params?: Record<string, string> };

// -- Glob matching: '/blog/*' captures a splat, '/users/:id' captures a
// named param, anything else must match exactly.
function matchGlob(pattern: string, path: string): GlobMatch {
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1); // keep the trailing '/'
    if (path.startsWith(prefix)) {
      return { matched: true, splat: path.slice(prefix.length) };
    }
    return { matched: false };
  }

  if (pattern.includes(':')) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    if (patternParts.length !== pathParts.length) return { matched: false };
    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
      const part = patternParts[i] ?? '';
      const pathPart = pathParts[i] ?? '';
      if (part.startsWith(':')) {
        params[part.slice(1)] = pathPart;
      } else if (part !== pathPart) {
        return { matched: false };
      }
    }
    return { matched: true, params };
  }

  return { matched: pattern === path };
}

// Substitutes ':splat' and ':name' placeholders into a redirect target.
function resolveTo(to: string, match: GlobMatch): string {
  let result = to;
  if (match.splat !== undefined) result = result.replace(':splat', match.splat);
  if (match.params) {
    for (const [key, value] of Object.entries(match.params)) {
      result = result.replace(`:${key}`, value);
    }
  }
  return result;
}

function matchRedirect(rules: RedirectRule[], path: string): { rule: RedirectRule; to: string } | null {
  for (const rule of rules) {
    const match = matchGlob(rule.from, path);
    if (match.matched) return { rule, to: resolveTo(rule.to, match) };
  }
  return null;
}

function hasExtension(path: string): boolean {
  const last = path.split('/').pop() ?? '';
  return last.includes('.');
}

// Trailing-slash normalization.
function normalizeTrailingSlash(path: string, mode: 'add' | 'remove' | 'keep'): string {
  if (path === '/' || mode === 'keep') return path;
  const hasSlash = path.endsWith('/');
  if (mode === 'remove' && hasSlash) return path.slice(0, -1);
  if (mode === 'add' && !hasSlash && !hasExtension(path)) return `${path}/`;
  return path;
}

function indexPathFor(path: string): string {
  if (path === '/') return '/index.html';
  if (path.endsWith('/')) return `${path}index.html`;
  return `${path}/index.html`;
}

const HASHED_SEGMENT = /[.-][a-f0-9]{8,}\./i;

function defaultHeadersFor(path: string): Record<string, string> {
  if (HASHED_SEGMENT.test(path)) {
    return { 'Cache-Control': 'public, max-age=31536000, immutable' };
  }
  if (path.endsWith('.html')) {
    return { 'Cache-Control': 'public, max-age=0, must-revalidate' };
  }
  return {};
}

function headersFor(config: HostConfig, path: string): Record<string, string> {
  let headers = { ...defaultHeadersFor(path) };
  for (const rule of config.headers) {
    if (matchGlob(rule.for, path).matched) {
      headers = { ...headers, ...rule.values };
    }
  }
  return headers;
}

function buildRedirectResponse(config: HostConfig, matched: { rule: RedirectRule; to: string }): HostResponse {
  const status = matched.rule.status ?? 301;
  if (status === 200) {
    return { status: 200, path: matched.to, headers: headersFor(config, matched.to) };
  }
  return { status, location: matched.to, headers: {} };
}

export function resolveRequest(config: HostConfig, request: HostRequest): HostResponse {
  const trailingSlash = config.trailingSlash ?? 'keep';

  const forcedRules = config.redirects.filter((r) => r.force);
  const otherRules = config.redirects.filter((r) => !r.force);

  const normalizedPath = normalizeTrailingSlash(request.path, trailingSlash);
  if (normalizedPath !== request.path) {
    return { status: 308, location: normalizedPath, headers: headersFor(config, normalizedPath) };
  }
  const path = normalizedPath;

  // Forced redirects are checked BEFORE the file lookup: a force redirect
  // overrides an existing file, which is the whole point of `force`.
  const forced = matchRedirect(forcedRules, path);
  if (forced) return buildRedirectResponse(config, forced);

  if (config.files.includes(path)) {
    return { status: 200, path, headers: headersFor(config, path) };
  }

  const indexPath = indexPathFor(path);
  if (config.files.includes(indexPath)) {
    return { status: 200, path: indexPath, headers: headersFor(config, indexPath) };
  }

  const redirect = matchRedirect(otherRules, path);
  if (redirect) return buildRedirectResponse(config, redirect);

  if (config.spaFallback && !hasExtension(path)) {
    return { status: 200, path: '/index.html', headers: headersFor(config, '/index.html') };
  }

  return { status: 404, headers: headersFor(config, path) };
}

export default function App() {
  const config: HostConfig = {
    files: ['/index.html', '/assets/app-3f9c2a1b.js', '/about/index.html'],
    redirects: [{ from: '/old-home', to: '/index.html', status: 200, force: true }],
    headers: [{ for: '/assets/*', values: { 'X-Content-Type-Options': 'nosniff' } }],
    spaFallback: true,
    trailingSlash: 'remove',
  };

  const results = [
    resolveRequest(config, { path: '/assets/app-3f9c2a1b.js' }),
    resolveRequest(config, { path: '/about/' }),
    resolveRequest(config, { path: '/settings' }),
  ];

  return (
    <ul>
      {results.map((result, i) => (
        <li key={i}>
          {result.status} {result.path ?? result.location ?? ''}
        </li>
      ))}
    </ul>
  );
}
