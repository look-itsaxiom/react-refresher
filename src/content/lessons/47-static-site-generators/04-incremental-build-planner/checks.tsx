import type { Check } from '../../../types';

type BuildGraph = Record<string, string[]>;
type SitemapPage = { url: string; lastmod?: string };
type SitemapOptions = { site: string; lastmod?: string };

const graph: BuildGraph = {
  'data/posts.json': [],
  'data/authors.json': [],
  'templates/base.tsx': [],
  'templates/post.tsx': ['templates/base.tsx', 'data/posts.json'],
  'templates/author.tsx': ['templates/base.tsx', 'data/authors.json'],
  'pages/blog/hello-world.tsx': ['templates/post.tsx', 'content/hello-world.md'],
  'pages/blog/second-post.tsx': ['templates/post.tsx', 'content/second-post.md'],
  'pages/authors/ada.tsx': ['templates/author.tsx'],
  'pages/about.tsx': ['templates/base.tsx'],
  'content/hello-world.md': [],
  'content/second-post.md': [],
};

export const checks: Check[] = [
  {
    name: 'dirtyPages: a changed data file marks every page whose template depends on it, transitively',
    run: async ({ mod, expect }) => {
      const dirtyPages = mod.dirtyPages as (graph: BuildGraph, changed: string[]) => string[];
      const dirty = dirtyPages(graph, ['data/posts.json']);
      expect(dirty).to.deep.equal(['pages/blog/hello-world.tsx', 'pages/blog/second-post.tsx']);
    },
  },
  {
    name: 'dirtyPages: a directly changed page is dirty even with no other changed dependency',
    run: async ({ mod, expect }) => {
      const dirtyPages = mod.dirtyPages as (graph: BuildGraph, changed: string[]) => string[];
      const dirty = dirtyPages(graph, ['pages/about.tsx']);
      expect(dirty).to.deep.equal(['pages/about.tsx']);
    },
  },
  {
    name: 'dirtyPages: an unrelated changed file marks no pages dirty',
    run: async ({ mod, expect }) => {
      const dirtyPages = mod.dirtyPages as (graph: BuildGraph, changed: string[]) => string[];
      expect(dirtyPages(graph, ['content/does-not-exist.md'])).to.deep.equal([]);
    },
  },
  {
    name: 'buildOrder: every node comes after all of its own dependencies',
    run: async ({ mod, expect }) => {
      const dirtyPages = mod.dirtyPages as (graph: BuildGraph, changed: string[]) => string[];
      const buildOrder = mod.buildOrder as (dirty: string[], graph: BuildGraph) => string[];
      const dirty = dirtyPages(graph, ['data/posts.json']);
      const order = buildOrder(dirty, graph);

      const indexOf = (node: string) => order.indexOf(node);
      expect(indexOf('data/posts.json')).to.be.at.least(0);
      expect(indexOf('templates/post.tsx')).to.be.greaterThan(indexOf('data/posts.json'));
      expect(indexOf('templates/post.tsx')).to.be.greaterThan(indexOf('templates/base.tsx'));
      expect(indexOf('pages/blog/hello-world.tsx')).to.be.greaterThan(indexOf('templates/post.tsx'));
      expect(indexOf('pages/blog/hello-world.tsx')).to.be.greaterThan(indexOf('content/hello-world.md'));
      expect(indexOf('pages/blog/second-post.tsx')).to.be.greaterThan(indexOf('templates/post.tsx'));
    },
  },
  {
    name: 'buildOrder: contains exactly the dirty pages and their transitive dependencies, no extras',
    run: async ({ mod, expect }) => {
      const buildOrder = mod.buildOrder as (dirty: string[], graph: BuildGraph) => string[];
      const order = buildOrder(['pages/authors/ada.tsx'], graph);
      expect([...order].sort()).to.deep.equal(
        ['data/authors.json', 'pages/authors/ada.tsx', 'templates/author.tsx', 'templates/base.tsx'].sort(),
      );
      expect(order).to.not.include('pages/about.tsx');
      expect(order).to.not.include('data/posts.json');
    },
  },
  {
    name: 'generateSitemap: produces an escaped urlset with a fallback lastmod',
    run: async ({ mod, expect }) => {
      const generateSitemap = mod.generateSitemap as (pages: SitemapPage[], options: SitemapOptions) => string;
      const xml = generateSitemap(
        [{ url: '/blog/a-b' }, { url: '/tag?name=react&sort=new' }],
        { site: 'https://example.com/', lastmod: '2026-09-18' },
      );
      expect(xml).to.include('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).to.include('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(xml).to.include('<loc>https://example.com/blog/a-b</loc><lastmod>2026-09-18</lastmod>');
      expect(xml).to.include('<loc>https://example.com/tag?name=react&amp;sort=new</loc><lastmod>2026-09-18</lastmod>');
      expect(xml.endsWith('</urlset>')).to.equal(true);
    },
  },
  {
    name: 'generateSitemap: a per-page lastmod overrides the fallback, and a page with neither omits the tag',
    run: async ({ mod, expect }) => {
      const generateSitemap = mod.generateSitemap as (pages: SitemapPage[], options: SitemapOptions) => string;
      const xml = generateSitemap(
        [{ url: '/one', lastmod: '2026-01-01' }, { url: '/two' }],
        { site: 'https://example.com' },
      );
      expect(xml).to.include('<loc>https://example.com/one</loc><lastmod>2026-01-01</lastmod>');
      expect(xml).to.include('<loc>https://example.com/two</loc></url>');
      expect(xml).to.not.include('<loc>https://example.com/two</loc><lastmod>');
    },
  },
];
