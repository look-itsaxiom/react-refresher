import type { Check } from '../../../types';

type LinkDescriptor = {
  rel: 'modulepreload' | 'preload' | 'preconnect' | 'prefetch';
  href: string;
  as?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
};

type RouteManifest = {
  routes: Record<string, { chunks: string[]; lcpImage?: string; nextRoutes?: string[] }>;
  thirdPartyOrigins?: string[];
};

type FontSpec = {
  family: string;
  role: 'body' | 'icon' | 'display';
  src: string;
  fallbackMetrics?: { fallbackFamily: string; sizeAdjust: number; ascentOverride?: number };
};

type FontDecision = { family: string; fontDisplay: 'swap' | 'optional'; preload: boolean; css: string };

const manifest: RouteManifest = {
  routes: {
    home: {
      chunks: ['chunk-home.js', 'chunk-vendor.js'],
      lcpImage: '/images/hero.jpg',
      nextRoutes: ['products', 'about'],
    },
    products: { chunks: ['chunk-products.js'] },
    about: { chunks: [] },
  },
  thirdPartyOrigins: ['https://analytics.example.com', 'https://fonts.example.com'],
};

export const checks: Check[] = [
  {
    name: 'planResourceHints: orders modulepreload, then the LCP image preload, then preconnects, then prefetches',
    run: async ({ mod, expect }) => {
      const planResourceHints = mod.planResourceHints as (m: RouteManifest, r: string) => LinkDescriptor[];
      const hints = planResourceHints(manifest, 'home');

      expect(hints.slice(0, 2)).to.deep.equal([
        { rel: 'modulepreload', href: 'chunk-home.js' },
        { rel: 'modulepreload', href: 'chunk-vendor.js' },
      ]);

      const preload = hints[2];
      expect(preload).to.deep.equal({
        rel: 'preload',
        href: '/images/hero.jpg',
        as: 'image',
        fetchPriority: 'high',
      });

      const preconnects = hints.filter((h) => h.rel === 'preconnect');
      expect(preconnects.map((h) => h.href)).to.deep.equal([
        'https://analytics.example.com',
        'https://fonts.example.com',
      ]);

      const prefetches = hints.filter((h) => h.rel === 'prefetch');
      expect(prefetches).to.deep.equal([{ rel: 'prefetch', href: 'chunk-products.js', fetchPriority: 'low' }]);

      // preconnects must come before prefetches, and modulepreloads before the image preload
      const rels = hints.map((h) => h.rel);
      expect(rels.indexOf('preconnect')).to.be.lessThan(rels.indexOf('prefetch'));
      expect(rels.indexOf('modulepreload')).to.be.lessThan(rels.indexOf('preload'));
    },
  },
  {
    name: 'planResourceHints: a route with no lcpImage or nextRoutes only gets its own chunks; an unknown route gets nothing',
    run: async ({ mod, expect }) => {
      const planResourceHints = mod.planResourceHints as (m: RouteManifest, r: string) => LinkDescriptor[];

      const productsHints = planResourceHints(manifest, 'products');
      expect(productsHints).to.deep.equal([
        { rel: 'modulepreload', href: 'chunk-products.js' },
        { rel: 'preconnect', href: 'https://analytics.example.com' },
        { rel: 'preconnect', href: 'https://fonts.example.com' },
      ]);

      expect(planResourceHints(manifest, 'nope')).to.deep.equal([]);
    },
  },
  {
    name: "fontStrategy: a body font preloads, swaps, and includes a sized fallback @font-face when metrics are given",
    run: async ({ mod, expect }) => {
      const fontStrategy = mod.fontStrategy as (fonts: FontSpec[]) => FontDecision[];
      const decisions = fontStrategy([
        {
          family: 'Inter',
          role: 'body',
          src: '/fonts/inter.woff2',
          fallbackMetrics: { fallbackFamily: 'Arial', sizeAdjust: 107, ascentOverride: 90 },
        },
      ]);
      const decision = decisions[0]!;

      expect(decision.family).to.equal('Inter');
      expect(decision.fontDisplay).to.equal('swap');
      expect(decision.preload).to.equal(true);
      expect(decision.css).to.include("font-family: 'Inter'");
      expect(decision.css).to.include('font-display: swap');
      expect(decision.css).to.include("font-family: 'Inter Fallback'");
      expect(decision.css).to.include("src: local('Arial')");
      expect(decision.css).to.include('size-adjust: 107%');
      expect(decision.css).to.include('ascent-override: 90%');
    },
  },
  {
    name: 'fontStrategy: a non-body font is optional, never preloaded, and never gets a fallback block even with metrics',
    run: async ({ mod, expect }) => {
      const fontStrategy = mod.fontStrategy as (fonts: FontSpec[]) => FontDecision[];
      const decisions = fontStrategy([
        {
          family: 'Icon Set',
          role: 'icon',
          src: '/fonts/icons.woff2',
          fallbackMetrics: { fallbackFamily: 'Arial', sizeAdjust: 120 },
        },
      ]);
      const decision = decisions[0]!;

      expect(decision.fontDisplay).to.equal('optional');
      expect(decision.preload).to.equal(false);
      expect(decision.css).to.include('font-display: optional');
      expect(decision.css).to.not.include('Fallback');
      expect(decision.css).to.not.include('size-adjust');
    },
  },
];
