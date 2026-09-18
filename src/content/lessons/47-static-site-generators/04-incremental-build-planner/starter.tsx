export type BuildGraph = Record<string, string[]>;

function closure(graph: BuildGraph, node: string, seen: Set<string> = new Set()): Set<string> {
  if (seen.has(node)) return seen;
  seen.add(node);
  for (const dep of graph[node] ?? []) {
    closure(graph, dep, seen);
  }
  return seen;
}

// TODO: a page (a key in `graph` starting with 'pages/') is dirty if any file in
// `changed` is the page itself or anywhere in its transitive dependency closure
// (`closure` above already walks that for you). Return the dirty page names, sorted.
export function dirtyPages(graph: BuildGraph, changed: string[]): string[] {
  return [];
}

// TODO: return every node reachable from `dirty` (the dirty pages plus everything
// they transitively depend on), ordered so each node comes *after* all of its own
// dependencies — the ordering a build needs to run safely: data before the templates
// that read it, templates before the pages that render with them.
//
// `nodes` (below) is already the full set you need to order. Fill in `visit` with a
// post-order depth-first traversal: recurse into a node's dependencies (only the ones
// present in `nodes`, sorted for determinism) before pushing the node itself onto
// `order`.
export function buildOrder(dirty: string[], graph: BuildGraph): string[] {
  const nodes = new Set<string>();
  for (const page of dirty) {
    for (const node of closure(graph, page)) nodes.add(node);
  }

  const order: string[] = [];
  const visited = new Set<string>();

  function visit(node: string): void {
    visited.add(node);
    order.push(node);
  }

  for (const node of [...nodes].sort()) visit(node);
  return order;
}

export type SitemapPage = { url: string; lastmod?: string };
export type SitemapOptions = { site: string; lastmod?: string };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// TODO: build a sitemap.org <urlset> XML string. For each page, join `options.site`
// (with any trailing slash stripped) and `page.url` (ensuring exactly one slash between
// them) into an escaped <loc>, and add a <lastmod> tag using `page.lastmod ??
// options.lastmod` when either is present (omit the tag entirely if neither is set).
// Wrap every <url> in <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">...
// </urlset>, preceded by an <?xml version="1.0" encoding="UTF-8"?> declaration.
export function generateSitemap(pages: SitemapPage[], options: SitemapOptions): string {
  return '';
}

const sampleGraph: BuildGraph = {
  'data/posts.json': [],
  'templates/base.tsx': [],
  'templates/post.tsx': ['templates/base.tsx', 'data/posts.json'],
  'pages/blog/hello-world.tsx': ['templates/post.tsx', 'content/hello-world.md'],
  'pages/blog/second-post.tsx': ['templates/post.tsx', 'content/second-post.md'],
  'pages/about.tsx': ['templates/base.tsx'],
  'content/hello-world.md': [],
  'content/second-post.md': [],
};

export default function App() {
  const changed = ['data/posts.json'];
  const dirty = dirtyPages(sampleGraph, changed);
  const order = buildOrder(dirty, sampleGraph);
  const sitemap = generateSitemap(
    dirty.map((url) => ({ url: url.replace(/^pages/, '').replace(/\.tsx$/, '') })),
    { site: 'https://example.com', lastmod: '2026-09-18' },
  );

  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Changed: {changed.join(', ')}</h2>
      <h3>Dirty pages ({dirty.length})</h3>
      <ul>
        {dirty.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <h3>Build order ({order.length} nodes)</h3>
      <ol>
        {order.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ol>
      <h3>Sitemap</h3>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{sitemap}</pre>
    </div>
  );
}
