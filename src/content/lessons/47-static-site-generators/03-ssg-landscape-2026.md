# The 2026 SSG landscape and when to hybridize

The previous step described what an SSG does. This one is about which tool, because
"static site generator" now spans everything from zero-JS blogs to hybrid apps that are
static on some routes and server-rendered on others.

## Astro: islands, server islands, and three output modes

Astro is the generator most React developers will actually touch, because it renders
React (and Vue, Svelte, Solid) components as **islands**: the page is static HTML by
default, and a component only ships client-side JavaScript if you explicitly mark it —
`client:load` (hydrate immediately), `client:visible` (hydrate when it scrolls into
view), `client:idle`. Nothing else on the page pays a hydration cost, which is the
opposite default from a React SPA, where the whole tree hydrates whether a given
component needs interactivity or not.

Astro's `output` config has three settings worth knowing precisely:

- `output: 'static'` — every route is prerendered at build time. No server needed to
  run it; deploy the output directory anywhere.
- `output: 'server'` — every route renders on request by default (Astro behaves like an
  SSR framework), and individual routes opt into `prerender = true` to stay static.
- `output: 'hybrid'` semantics now live inside `'server'` mode as the per-route
  `prerender` export — Astro 5+ collapsed the old three-way config into "server unless a
  route says otherwise."

**Server islands** (stable since Astro 5) are the sharper tool for "mostly static, one
part isn't": a page renders and caches as static HTML, but a single island's markup is
deferred and fetched from the server after the shell loads — a per-user cart count or a
live comment total, without moving the entire page off the static path. It's a smaller
compromise than hybrid mode, because only the one dynamic fragment costs a server round
trip.

## The docs-and-blog specialists

Three generators exist specifically because "render Markdown into a themed site with
navigation and search" is common enough to not reinvent per project:

- **Eleventy (11ty) 3.x** ships zero client-side JavaScript by default and doesn't
  assume any particular UI framework — it's template-agnostic (Nunjucks, Liquid,
  JavaScript template functions) and, as of v3, ESM-native. It's the right default when
  the site is content, not an application: a blog, a marketing site, documentation
  without heavy interactivity. There's no hydration story to think about because there's
  no client-side component tree.
- **Docusaurus 3.x** is Meta's docs generator, React-based, with versioned docs,
  built-in i18n, and a plugin architecture aimed squarely at product/API documentation
  with a marketing-ish landing page in front of it. If the team already knows React and
  wants docs-specific conventions (versioning, "edit this page" links, admonitions) out
  of the box, Docusaurus is the default reach.
- **VitePress 2.x** is Vue-based (via Vite), and reaches the same audience for teams
  in the Vue/Vite ecosystem or the Vue documentation itself. It doesn't require writing
  Vue for basic Markdown-to-docs use, only for custom theming.
- **Starlight** (an Astro-based docs theme) has been eating into both of the above,
  because it inherits Astro's islands model — a docs site is nearly all static HTML, so
  Starlight ships less JavaScript per page than a full framework's docs mode by default,
  while still supporting React/Vue/Svelte components dropped into MDX where needed.

None of these four are a reasonable choice for an application with meaningful per-user
state; they're all optimized for "mostly the same HTML for every visitor," which is
exactly the SSG sweet spot.

## Static export from the app frameworks

Next.js and React Router — both meta-frameworks for *applications*, covered two lessons
ago — can also produce pure static output for routes that don't need a server:

- Next.js `output: 'export'` in `next.config.ts` prerenders every route to static HTML
  at build time and disables the features that require a Node/edge runtime (Image
  Optimization's on-demand resizing, Server Actions, middleware/`proxy.ts`, ISR's
  on-demand revalidation). It's the right call when the *whole app* is static; a single
  static export can't mix in server-rendered routes.
- React Router 8's `prerender` config (framework mode) is more surgical: you list which
  routes should be rendered to static HTML at build time — via an explicit path list or
  a function that returns paths, the same shape as Next's `generateStaticParams` — while
  other routes in the same app keep running their `loader`/`action` on a server. That's
  a hybrid app, not a static site, but it means "make the marketing pages static, keep
  the dashboard dynamic" doesn't require two separate projects.

## When content changes too often for a rebuild

SSG's weak point is exactly its strength inverted: **a full rebuild is the unit of
freshness.** A site with 10 pages rebuilds in seconds; a commerce catalog with 200,000
SKUs updated by a warehouse feed every few minutes cannot rebuild fully on every change
and still call itself "static." Three responses, in order of how much server you accept
back:

1. **Incremental builds.** Only rebuild the pages whose dependencies (a template, a data
   file, a content file) actually changed, using a dependency graph — this is what the
   next exercise implements. A CMS webhook fires on publish, the build system computes
   the dirty set, and only those pages regenerate. Build-time budgets for thousands of
   pages live or die on this; a linear "rebuild everything" strategy stops being viable
   long before a catalog reaches six figures of pages.
2. **Preview builds.** A CMS's "preview" button triggers a one-off build (or a server-
   rendered preview route) of just the unpublished draft, so an editor sees the result
   without waiting on or polluting the production build.
3. **ISR or edge SSR as the middle ground.** When even incremental rebuilds can't keep
   up — inventory counts changing every few seconds — Incremental Static Regeneration
   (serve a stale static page, regenerate it in the background after a TTL) or genuine
   per-request SSR at the edge are the honest answer. That's not a static site anymore;
   it's the SSR/ISR lessons earlier in this track, reached because the freshness
   requirement outgrew what a build step can promise.

## A decision rubric

- **Content is the same for every visitor, and changes on a human timescale (hours to
  days)?** SSG. Pick Eleventy for zero-JS content, Astro for anything that needs a few
  interactive islands, Docusaurus/VitePress/Starlight for docs specifically.
- **Mostly static, with a handful of per-user fragments?** Astro server islands, or
  React Router `prerender` for the static routes plus ordinary loaders for the dynamic
  ones.
- **Content changes faster than a rebuild can track, but caching stale-for-a-bit is
  fine?** ISR.
- **Genuinely per-request, personalized, or write-heavy?** You're not building a static
  site; go back to the SSR and streaming lessons.

## Further reading

- [Astro: Server islands](https://docs.astro.build/en/guides/server-islands/)
- [Astro: On-demand rendering (`output` modes)](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Next.js: Static Exports](https://nextjs.org/docs/app/guides/static-exports)
- [React Router: Pre-rendering](https://reactrouter.com/how-to/pre-rendering)
- [Eleventy](https://www.11ty.dev/)
