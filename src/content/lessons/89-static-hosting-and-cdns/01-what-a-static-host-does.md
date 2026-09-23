## What a static host actually does

"Static hosting" undersells what these platforms do. A static host today is
four things bundled together: **origin storage** for your build output, a
**CDN** that serves it from edge locations near the visitor, **atomic
deploys** (the whole file tree flips over in one step, never half-updated),
and **preview URLs** for every branch or pull request. GitHub Pages,
Netlify, Vercel, and Cloudflare Pages all give you this bundle; they differ
in configuration surface, not in the basic model.

This is orthogonal to the rendering strategy you picked in lesson 44. SSG
output, a client-rendered SPA's `dist/`, and even some SSR setups (via
Netlify/Vercel's function adapters) all land on infrastructure shaped like
this. This lesson is about where the bytes go and how requests get routed
once they're there — not which rendering strategy produced them.

### The four platforms, compared

| | GitHub Pages | Netlify | Vercel | Cloudflare Pages |
|---|---|---|---|---|
| Config file | none (Actions workflow) | `netlify.toml` | `vercel.json` | `wrangler.jsonc` or dashboard |
| Redirects/rewrites | not supported natively | `_redirects` or `netlify.toml` | `vercel.json` `redirects`/`rewrites` | `_redirects` |
| Custom headers | not supported natively | `_headers` | `vercel.json` `headers` | `_headers` or `wrangler.jsonc` |
| SPA fallback | `404.html` hack (real 404 status) | `/* /index.html 200` rewrite | catch-all rewrite to `/index.html` | `not_found_handling` config, 200 rewrite |
| Deploy previews | none built in | per-PR deploy previews | per-push preview deployments | per-branch preview deployments |
| Deploy mechanism | GitHub Actions + `actions/deploy-pages` | git push or CLI | git push or CLI | git push, CLI, or dashboard |

Treat the limits row as a hedge: bandwidth caps, build-minute quotas, and
free-tier terms move often enough (and have moved on more than one of these
platforms in the last two years) that you should read the current pricing
page before committing, not this lesson.

### GitHub Pages and the `base` path trap

GitHub Pages deploys today go through GitHub Actions — you build in a
workflow and hand the output to `actions/upload-pages-artifact` and
`actions/deploy-pages`, rather than pushing a `gh-pages` branch by hand
(that older approach still works, but the Actions-based flow is what GitHub
documents as current).

The trap is the URL shape. A **user/org site** (`you.github.io`) is served
from the domain root, so `/assets/main.js` resolves correctly. A **project
site** (`you.github.io/my-repo/`) is served under a subpath — every asset
URL needs that `/my-repo/` prefix, or the browser requests
`you.github.io/assets/main.js` and gets a 404. Vite's fix is the `base`
option in `vite.config.ts`:

```ts
export default defineConfig({
  base: '/my-repo/',
});
```

Read it back at runtime with `import.meta.env.BASE_URL` (for links you build
by hand) rather than hardcoding the path a second time. Forgetting `base`
on a project site is the single most common "it works locally, it's blank
on GitHub Pages" bug. GitHub Pages also has no first-party redirects or
custom response headers — anything in that category needs the `404.html`
trick (see concept 2) or a different host.

### DNS and HTTPS

Every platform here auto-provisions a TLS certificate (via Let's Encrypt or
an equivalent) once your custom domain resolves to them, so HTTPS setup is
usually "add a DNS record, wait." For a subdomain (`app.example.com`), that
record is a `CNAME` pointing at the platform's edge hostname. For an **apex
domain** (`example.com`, no subdomain), DNS forbids a `CNAME` at the zone
root — you need an `A`/`AAAA` record, or your DNS provider's apex-flattening
feature (Cloudflare calls this `CNAME` flattening automatically; other
providers expose it as `ALIAS` or `ANAME`).

### Atomic deploys change what "deploying" means

Every one of these platforms treats a deploy as an immutable, addressable
snapshot: the new file tree is fully uploaded and verified *before* any
traffic switches to it, and the switch itself is instant. There's no window
where some visitors get old HTML referencing new (missing) assets, or vice
versa — the classic race condition of `rsync`-ing a live directory. Old
deploys stick around too, which is what makes rollback (concept 2) as cheap
as "point traffic back at the previous snapshot" instead of a git revert
and a fresh build.

One more hedge worth stating plainly: Cloudflare has been steering *new*
projects toward Workers with static assets (a `wrangler.jsonc` `assets`
block, `not_found_handling: 'single-page-application'` for SPA fallback)
rather than the older Cloudflare Pages product, though Pages continues to
work and is still widely deployed. If you're choosing a Cloudflare product
today, check developers.cloudflare.com for the current recommendation
before assuming either product is the "default."

### Further reading (optional)

- [GitHub Pages documentation](https://docs.github.com/en/pages)
- [Netlify docs: overview](https://docs.netlify.com/)
- [Vercel docs: deployments](https://vercel.com/docs/deployments)
- [Cloudflare: Pages vs. Workers with static assets](https://developers.cloudflare.com/workers/static-assets/)
