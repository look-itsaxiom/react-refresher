export type AssetKind = 'html' | 'js' | 'css' | 'image' | 'api' | 'font';

export type AssetDescriptor = {
  path: string;
  hashed: boolean;
  kind: AssetKind;
  personalized?: boolean;
};

export type CachePolicy = {
  cacheControl: string;
  vary?: string;
  notes?: string[];
};

export type HttpHeaders = Record<string, string>;

/**
 * Recommends a Cache-Control (and, where relevant, Vary) for a build output
 * or response, given how this course's Vite build actually names files.
 */
export function cachePolicyFor(asset: AssetDescriptor): CachePolicy {
  // Content-hashed filenames (main.a1b2c3.js, logo.9f8e7d.png, ...) can never
  // point at different bytes without a different URL, so there's nothing to
  // ever revalidate. This is the one case that earns `immutable`.
  if (asset.hashed) {
    // BUG: missing `immutable` -- a hashed asset should never need a
    // conditional request at all, but this leaves the browser free to
    // revalidate it anyway once max-age runs out.
    return { cacheControl: 'public, max-age=31536000' };
  }

  if (asset.kind === 'font') {
    return {
      cacheControl: 'public, max-age=31536000, immutable',
      notes: [
        'Fonts loaded cross-origin (e.g. from a CDN subdomain) need Access-Control-Allow-Origin or the browser refuses to use the cached response.',
      ],
    };
  }

  if (asset.kind === 'html') {
    // Vite emits an unhashed index.html that references the hashed bundles.
    // It must always be revalidated so a deploy is visible on the next load,
    // but it can still skip a full re-download via a 304.
    return { cacheControl: 'no-cache' };
  }

  if (asset.kind === 'api') {
    // BUG: personalized data falls through to the same public, cacheable
    // policy as everything else -- a shared cache is now allowed to serve
    // one user's account data to the next visitor.
    return {
      cacheControl: 'public, max-age=60, stale-while-revalidate=30',
      vary: 'Accept-Encoding',
    };
  }

  // Unhashed static output (rare, but possible for a hand-placed file) --
  // a conservative default that still avoids hitting the origin every time.
  return { cacheControl: 'public, max-age=3600, stale-while-revalidate=600' };
}

/**
 * A page stops being eligible for the back/forward cache if it registers an
 * `unload` listener -- that has always disqualified it, in every browser.
 *
 * `Cache-Control: no-store` on the page's own response used to disqualify it
 * in Chrome too, but Chrome's 2024-2025 rollout (complete by April 2025)
 * changed that: `no-store` pages can now enter bfcache, just with a shorter
 * cap (3 minutes instead of 10) and eviction on any cookie change. Treat that
 * old assumption as wrong going forward.
 */
export function bfcacheEligible(pageHeaders: HttpHeaders, usesUnload: boolean): boolean {
  // BUG: still treats `no-store` as disqualifying, and never checks
  // `usesUnload` at all -- both are wrong for 2026 Chrome.
  if (pageHeaders['Cache-Control']?.includes('no-store')) return false;
  return true;
}

export default function App() {
  const policies = [
    cachePolicyFor({ path: '/assets/main.a1b2c3.js', hashed: true, kind: 'js' }),
    cachePolicyFor({ path: '/index.html', hashed: false, kind: 'html' }),
    cachePolicyFor({ path: '/api/account', hashed: false, kind: 'api', personalized: true }),
  ];

  return (
    <ul>
      {policies.map((policy) => (
        <li key={policy.cacheControl}>{policy.cacheControl}</li>
      ))}
    </ul>
  );
}
