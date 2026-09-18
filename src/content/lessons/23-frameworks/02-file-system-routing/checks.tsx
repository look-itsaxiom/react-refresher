import type { Check } from '../../../types';

const files = [
  'app/page.tsx',
  'app/layout.tsx',
  'app/blog/[slug]/page.tsx',
  'app/(marketing)/about/page.tsx',
  'app/docs/[...parts]/page.tsx',
  'app/shop/layout.tsx',
  'app/shop/page.tsx',
];

type RouteRecord = {
  pattern: string;
  paramNames: string[];
  filePath: string;
  layouts: string[];
};
type MatchResult = { route: RouteRecord; params: Record<string, string | string[]> };

export const checks: Check[] = [
  {
    name: 'buildRoutes: static root and nested static segments produce plain patterns',
    run: async ({ mod, expect }) => {
      const buildRoutes = mod.buildRoutes as (files: string[]) => RouteRecord[];
      const routes = buildRoutes(files);
      const root = routes.find((r) => r.filePath === 'app/page.tsx');
      const shop = routes.find((r) => r.filePath === 'app/shop/page.tsx');
      expect(root?.pattern).to.equal('/');
      expect(shop?.pattern).to.equal('/shop');
    },
  },
  {
    name: 'buildRoutes: a route group folder disappears from the URL pattern',
    run: async ({ mod, expect }) => {
      const buildRoutes = mod.buildRoutes as (files: string[]) => RouteRecord[];
      const routes = buildRoutes(files);
      const about = routes.find((r) => r.filePath === 'app/(marketing)/about/page.tsx');
      expect(about?.pattern).to.equal('/about');
      expect(about?.pattern).to.not.include('marketing');
    },
  },
  {
    name: 'buildRoutes: dynamic and catch-all segments become :param and *param, with matching paramNames',
    run: async ({ mod, expect }) => {
      const buildRoutes = mod.buildRoutes as (files: string[]) => RouteRecord[];
      const routes = buildRoutes(files);
      const blog = routes.find((r) => r.filePath === 'app/blog/[slug]/page.tsx');
      const docs = routes.find((r) => r.filePath === 'app/docs/[...parts]/page.tsx');
      expect(blog?.pattern).to.equal('/blog/:slug');
      expect(blog?.paramNames).to.deep.equal(['slug']);
      expect(docs?.pattern).to.equal('/docs/*parts');
      expect(docs?.paramNames).to.deep.equal(['parts']);
    },
  },
  {
    name: 'buildRoutes: layout chain nests root-to-leaf, and a directory layout only applies beneath it',
    run: async ({ mod, expect }) => {
      const buildRoutes = mod.buildRoutes as (files: string[]) => RouteRecord[];
      const routes = buildRoutes(files);
      const shop = routes.find((r) => r.filePath === 'app/shop/page.tsx');
      const about = routes.find((r) => r.filePath === 'app/(marketing)/about/page.tsx');
      // the root app/layout.tsx wraps every route; app/shop/layout.tsx additionally wraps only /shop
      expect(shop?.layouts).to.deep.equal(['app/layout.tsx', 'app/shop/layout.tsx']);
      expect(about?.layouts).to.deep.equal(['app/layout.tsx']);
    },
  },
  {
    name: 'matchRoute: matches a static path and a dynamic path, extracting params',
    run: async ({ mod, expect }) => {
      const buildRoutes = mod.buildRoutes as (files: string[]) => RouteRecord[];
      const matchRoute = mod.matchRoute as (routes: RouteRecord[], url: string) => MatchResult | null;
      const routes = buildRoutes(files);

      const aboutMatch = matchRoute(routes, '/about');
      expect(aboutMatch?.route.filePath).to.equal('app/(marketing)/about/page.tsx');

      const blogMatch = matchRoute(routes, '/blog/hello-world');
      expect(blogMatch?.route.filePath).to.equal('app/blog/[slug]/page.tsx');
      expect(blogMatch?.params).to.deep.equal({ slug: 'hello-world' });
    },
  },
  {
    name: 'matchRoute: a catch-all absorbs every remaining segment as an array',
    run: async ({ mod, expect }) => {
      const buildRoutes = mod.buildRoutes as (files: string[]) => RouteRecord[];
      const matchRoute = mod.matchRoute as (routes: RouteRecord[], url: string) => MatchResult | null;
      const routes = buildRoutes(files);

      const docsMatch = matchRoute(routes, '/docs/guides/routing/dynamic');
      expect(docsMatch?.route.filePath).to.equal('app/docs/[...parts]/page.tsx');
      expect(docsMatch?.params).to.deep.equal({ parts: ['guides', 'routing', 'dynamic'] });

      const noMatch = matchRoute(routes, '/nonexistent');
      expect(noMatch).to.equal(null);
    },
  },
];
