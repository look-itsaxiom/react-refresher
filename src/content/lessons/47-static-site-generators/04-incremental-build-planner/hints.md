For `dirtyPages`: filter `Object.keys(graph)` down to keys starting with `'pages/'`,
then for each one call `closure(graph, page)` and check
`[...closure(graph, page)].some((node) => changedSet.has(node))` where `changedSet` is
`new Set(changed)`. Don't forget the page itself is in its own closure (that's how a
directly-changed page file, not just its dependencies, still counts as dirty).
---
For `buildOrder`: `visit` needs to recurse *before* it pushes. Something like:
`for (const dep of (graph[node] ?? []).filter((d) => nodes.has(d)).sort()) { if
(!visited.has(dep)) visit(dep); }` placed before `order.push(node)`, and mark `node`
visited before recursing (to avoid infinite loops on a cycle, though this exercise's
graphs are acyclic). The outer loop over `[...nodes].sort()` guarantees every node in
`nodes` eventually gets visited even if it wasn't reached by an earlier node's
recursion.
---
For `generateSitemap`: build one `<url>...</url>` string per page — something like
`` `<url><loc>${escapeXml(site + path)}</loc>${lastmodTag}</url>` `` — then `.join('')`
all of them and wrap in
`` `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlTags}</urlset>` ``.
Compute `path` as `page.url.startsWith('/') ? page.url : '/' + page.url` so callers can
pass either form. `lastmodTag` is `` `<lastmod>${escapeXml(lastmod)}</lastmod>` `` when
a `lastmod` value exists (from the page or the fallback in `options`), otherwise an
empty string.
