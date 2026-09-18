import type { Check } from '../../../types';

type AssetKind = 'html' | 'js' | 'css' | 'image' | 'api' | 'font';
type AssetDescriptor = { path: string; hashed: boolean; kind: AssetKind; personalized?: boolean };
type CachePolicy = { cacheControl: string; vary?: string; notes?: string[] };
type HttpHeaders = Record<string, string>;

type Mod = {
  cachePolicyFor: (asset: AssetDescriptor) => CachePolicy;
  bfcacheEligible: (pageHeaders: HttpHeaders, usesUnload: boolean) => boolean;
};

export const checks: Check[] = [
  {
    name: 'a hashed asset gets a year of public, immutable caching',
    run: async ({ mod, expect }) => {
      const { cachePolicyFor } = mod as unknown as Mod;
      const policy = cachePolicyFor({ path: '/assets/main.a1b2c3.js', hashed: true, kind: 'js' });
      expect(policy.cacheControl).to.equal('public, max-age=31536000, immutable');
    },
  },
  {
    name: 'a hashed image or font is treated the same as a hashed script',
    run: async ({ mod, expect }) => {
      const { cachePolicyFor } = mod as unknown as Mod;
      const image = cachePolicyFor({ path: '/assets/logo.9f8e7d.png', hashed: true, kind: 'image' });
      const font = cachePolicyFor({ path: '/assets/inter.4b2a11.woff2', hashed: true, kind: 'font' });
      expect(image.cacheControl).to.equal('public, max-age=31536000, immutable');
      expect(font.cacheControl).to.equal('public, max-age=31536000, immutable');
    },
  },
  {
    name: 'an unhashed HTML entry point always revalidates',
    run: async ({ mod, expect }) => {
      const { cachePolicyFor } = mod as unknown as Mod;
      const policy = cachePolicyFor({ path: '/index.html', hashed: false, kind: 'html' });
      expect(policy.cacheControl).to.equal('no-cache');
    },
  },
  {
    name: 'a personalized API response is never stored in a shared cache',
    run: async ({ mod, expect }) => {
      const { cachePolicyFor } = mod as unknown as Mod;
      const policy = cachePolicyFor({ path: '/api/account', hashed: false, kind: 'api', personalized: true });
      expect(policy.cacheControl).to.equal('private, no-store');
    },
  },
  {
    name: 'a non-personalized API response can be shared briefly with stale-while-revalidate',
    run: async ({ mod, expect }) => {
      const { cachePolicyFor } = mod as unknown as Mod;
      const policy = cachePolicyFor({ path: '/api/status', hashed: false, kind: 'api' });
      expect(policy.cacheControl).to.equal('public, max-age=60, stale-while-revalidate=30');
    },
  },
  {
    name: 'an unhashed font still gets the CORS note',
    run: async ({ mod, expect }) => {
      const { cachePolicyFor } = mod as unknown as Mod;
      const policy = cachePolicyFor({ path: '/fonts/inter.woff2', hashed: false, kind: 'font' });
      expect(policy.notes?.some((note) => note.includes('Access-Control-Allow-Origin'))).to.equal(true);
    },
  },
  {
    name: 'a page using the unload event is never bfcache-eligible',
    run: async ({ mod, expect }) => {
      const { bfcacheEligible } = mod as unknown as Mod;
      expect(bfcacheEligible({}, true)).to.equal(false);
      expect(bfcacheEligible({ 'Cache-Control': 'public, max-age=60' }, true)).to.equal(false);
    },
  },
  {
    name: 'Cache-Control: no-store no longer disqualifies a page from bfcache',
    run: async ({ mod, expect }) => {
      const { bfcacheEligible } = mod as unknown as Mod;
      expect(bfcacheEligible({ 'Cache-Control': 'no-store' }, false), 'no-store alone should not block bfcache in 2026 Chrome').to.equal(true);
      expect(bfcacheEligible({}, false)).to.equal(true);
    },
  },
];
