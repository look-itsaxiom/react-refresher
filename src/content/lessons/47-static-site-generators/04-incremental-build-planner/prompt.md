A CMS webhook just told the build system that `data/posts.json` changed. Rebuilding
every page in a 50,000-page site because one shared data file changed is exactly the
cost incremental builds exist to avoid. This exercise builds the planner: which pages
are dirty, what order to rebuild them in, and the sitemap the rebuilt pages need.

`sampleGraph` models a tiny site as a dependency graph: each key is a file (a page, a
template, a data file, or a content file), and its value is the list of files it
directly depends on. `pages/blog/hello-world.tsx` depends on `templates/post.tsx` and
`content/hello-world.md`; `templates/post.tsx` depends on `templates/base.tsx` and
`data/posts.json`. A page's *full* dependency set is transitive — if the data file a
template reads changes, every page using that template is dirty too, even though the
page's own entry in the graph never mentions the data file directly.

Three functions need finishing in `App.tsx`:

## 1. `dirtyPages(graph, changed)`

A page (any key in `graph` starting with `'pages/'`) is dirty if any file in `changed`
is the page itself, or anywhere in the page's transitive dependency closure. The
`closure` helper (already written) walks that closure for you — call it once per page
and check whether any changed file is in the resulting set. Return the dirty page names,
sorted.

## 2. `buildOrder(dirty, graph)`

Given the dirty pages, rebuild has to visit **data before the templates that read it,
templates before the pages that render with them** — a dependency-first order. `nodes`
(the full set of dirty pages plus everything they transitively depend on) is already
computed for you. Fill in `visit(node)` as a post-order depth-first traversal: before
pushing `node` onto `order`, recurse into each of `node`'s dependencies that's present in
`nodes` (sorted, for a deterministic result) — the recursion is what guarantees
every dependency lands in `order` before the node that needs it.

## 3. `generateSitemap(pages, options)`

Build a [sitemap.org](https://www.sitemaps.org/protocol.html) `<urlset>` XML string.
For each page, join `options.site` (trailing slash stripped) and `page.url` into one
escaped `<loc>`, and add a `<lastmod>` tag from `page.lastmod ?? options.lastmod` when
either is set (omit the tag if neither is). `escapeXml` is already written — use it on
every piece of text that lands in the output.

`closure`, `escapeXml`, and the default `App` are already written.
