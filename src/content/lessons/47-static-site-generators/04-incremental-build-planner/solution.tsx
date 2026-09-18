export type BuildGraph = Record<string, string[]>;

function closure(graph: BuildGraph, node: string, seen: Set<string> = new Set()): Set<string> {
  if (seen.has(node)) return seen;
  seen.add(node);
  for (const dep of graph[node] ?? []) {
    closure(graph, dep, seen);
  }
  return seen;
}

export function dirtyPages(graph: BuildGraph, changed: string[]): string[] {
  const changedSet = new Set(changed);
  const pages = Object.keys(graph)
    .filter((key) => key.startsWith('pages/'))
    .sort();

  return pages.filter((page) => {
    const deps = closure(graph, page);
    return [...deps].some((node) => changedSet.has(node));
  });
}

export function buildOrder(dirty: string[], graph: BuildGraph): string[] {
  const nodes = new Set<string>();
  for (const page of dirty) {
    for (const node of closure(graph, page)) nodes.add(node);
  }

  const order: string[] = [];
  const visited = new Set<string>();

  function visit(node: string): void {
    if (visited.has(node)) return;
    visited.add(node);
    const deps = (graph[node] ?? []).filter((dep) => nodes.has(dep)).sort();
    for (const dep of deps) visit(dep);
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

export function generateSitemap(pages: SitemapPage[], options: SitemapOptions): string {
  const site = options.site.replace(/\/+$/, '');
  const urlTags = pages
    .map((page) => {
      const path = page.url.startsWith('/') ? page.url : `/${page.url}`;
      const loc = escapeXml(`${site}${path}`);
      const lastmod = page.lastmod ?? options.lastmod;
      const lastmodTag = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : '';
      return `<url><loc>${loc}</loc>${lastmodTag}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlTags}</urlset>`;
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
