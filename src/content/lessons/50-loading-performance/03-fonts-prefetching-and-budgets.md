# Fonts, prefetching, and budgets

Two more categories of loading work don't fit the code-splitting story: web fonts, which
have their own failure modes around layout shift and invisible text, and telling the
browser about pages the user hasn't navigated to yet. Both are still "ship less, ship in
order" — just applied to text rendering and future navigations instead of JS chunks.

## Web font loading

A `@font-face` with no strategy produces one of two bad defaults, depending on the
browser: FOIT (flash of invisible text — text is hidden until the font loads, so a slow
connection means a blank page) or FOUT (flash of unstyled text — the fallback font shows
first, then swaps, which is usually the better failure mode but can shift layout).
`font-display` controls which:

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-var.woff2') format('woff2-variations');
  font-display: swap; /* fallback shows immediately, swaps in when ready */
  font-weight: 100 900;
}
```

- `swap` — fallback immediately, swap when the real font arrives, no timeout. Right
  default for body text: something readable now beats nothing.
- `optional` — browser may skip the swap entirely if the font isn't ready almost
  immediately (roughly 100ms), and won't re-render later. Right default for decorative
  or icon fonts where showing the fallback forever is fine and a late layout jump isn't
  worth it.
- `block` — invisible text for a short window (~3s), then falls back. Rarely the right
  choice for body text in 2026; mostly a legacy default some tooling still ships.

Swap still costs you layout shift when the fallback and the real font have different
metrics — a wider fallback face means text reflows and pushes content down when the real
font swaps in, hurting Cumulative Layout Shift. `size-adjust`, `ascent-override`,
`descent-override`, and `line-gap-override` on a `@font-face` block let you resize a
*fallback* font's box metrics to match the real font's, so the swap doesn't move
anything:

```css
@font-face {
  font-family: 'Inter Fallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
}
```

Beyond `font-display`, four more levers:

- **Preload the one critical font.** `<link rel="preload" as="font" type="font/woff2"
  crossorigin>` for the body text font used above the fold — the browser wouldn't
  otherwise discover a font referenced from CSS until it parses that CSS and decides an
  element needs it. Don't preload every weight and style you ship; that's the same
  preload-everything mistake as JS.
- **Subset.** Ship only the glyphs a page actually uses (Latin-only for an English UI)
  instead of a font file covering every script. `unicode-range` on multiple `@font-face`
  rules for the same family lets the browser fetch only the subset covering the text it
  actually needs to render, per range.
- **Variable fonts.** One file with a weight (and sometimes width, slant) axis replaces
  four or six static files (`Inter-Regular.woff2`, `Inter-Bold.woff2`, ...). One request
  and one connection instead of several, at the cost of a larger single file — usually a
  net win once you're using three or more weights.
- **Self-host vs. a font CDN.** Google Fonts and similar services are fast, but they cost
  you a `preconnect` to a third-party origin and an extra DNS/TLS round trip that
  self-hosting from your own domain skips entirely; self-hosting also lets you control
  caching headers and `font-display` yourself instead of trusting the CDN's link tag.

## Prefetch and prerender: guessing the next navigation

Route-level code splitting (previous step) means the *next* page's chunk isn't fetched
until the user clicks. If you can guess where they're going, fetch it — or render it —
before they click.

- **`<link rel="prefetch">`** — low-priority fetch of a resource for a likely future
  navigation, cached for reuse. Cheap, safe, widely supported; the browser fetches bytes
  and stops there.
- **The Speculation Rules API** — a JSON policy (a `<script type="speculationrules">`
  block or an HTTP header) that goes further: `prefetch` fetches the next page's response,
  `prerender` does that *and* renders the full page (subresources, JS) in a hidden tab, so
  navigating to it is close to instant. As of 2026 this is Chromium-only (Chrome, Edge,
  Opera, Samsung Internet — roughly three-quarters of tracked traffic), with eagerness
  levels (`immediate`, `eager`, `moderate` — a ~200ms hover, `conservative` — pointer
  down) controlling how confident the browser needs to be before it acts:

  ```html
  <script type="speculationrules">
  {
    "prerender": [{ "urlmatch": "/products/*", "eagerness": "moderate" }]
  }
  </script>
  ```

  Prerendering is expensive per speculation (full render, real JS execution — including
  side effects like analytics firing, though Chrome 144 added a mode that pauses at the
  first blocking script to avoid that), so scope it to a handful of high-confidence
  targets, not the whole site.
- **Framework link prefetch** — React Router 8's `<Link prefetch="intent">` and
  Next.js 16's default `<Link>` prefetching both wrap this same idea (hover/viewport ⇒
  fetch the route's chunk and data) in a component API, without you writing speculation
  rules by hand. Reach for the framework primitive first; drop to raw `rel="prefetch"` or
  speculation rules when you're not on a framework that gives you one.

## 103 Early Hints and HTTP/3 recap

A `103 Early Hints` response lets the server send `Link: rel=preload`/`preconnect`
headers *before* the final `200` response is ready — useful when the server does real
work (a database query, an origin fetch) before it can render HTML, since the browser can
start fetching CSS, fonts, and preconnecting to third-party origins during that think
time instead of after. It requires HTTP/2 or HTTP/3 and support from your CDN or origin
server (Cloudflare, Fastly, and Akamai all support it); browser support for the `preload`
hint inside a 103 is strong in Chromium and Firefox but Safari only honors `preconnect`
there, not `preload` — plan for graceful degradation, don't rely on it exclusively.
HTTP/3 itself (QUIC, avoiding TCP head-of-line blocking) mostly matters for high-latency
or lossy connections; on a fast wired connection the gap versus HTTP/2 is small, but it's
close to free to enable at the CDN layer and helps mobile users the most.

## Performance budgets in CI

None of the above sticks if nothing stops a regression from shipping. A performance
budget is a threshold checked automatically:

- **Bundle size budgets** (`size-limit`, or `bundlesize`) fail a CI build if a named
  entry point or chunk exceeds a byte limit — catches "someone imported all of `lodash`"
  before it merges, without waiting for a Lighthouse run.
- **Lighthouse CI** runs Lighthouse against a built preview on every PR and can assert
  on scores or specific metrics (LCP, CLS — see lesson 49) with a configurable regression
  tolerance, and posts the diff as a PR comment or check.

## A Vite 8 checklist

- Vite's Rolldown-based bundler chunks by default along dynamic-import boundaries (the
  mechanics from lesson 36); reach for `build.rollupOptions.output.manualChunks` only
  when you've measured a specific problem (a huge shared vendor chunk that changes on
  every deploy) — it's easy to make chunking worse by hand.
- `build.modulePreload` controls whether Vite injects `modulepreload` links for a page's
  direct dependencies (on by default) and can inject a small polyfill for browsers
  without native `modulepreload` support; leave it on unless you have a reason not to.
- Run `vite build` with a bundle analyzer (`rollup-plugin-visualizer` or similar) after
  any dependency change that feels heavier than it should, not just when a budget check
  already failed.

## Further reading

- [web.dev: Best practices for fonts](https://web.dev/articles/font-best-practices)
- [MDN: Speculation Rules API](https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API)
- [Chrome for Developers: 103 Early Hints](https://developer.chrome.com/docs/web-platform/early-hints)
- [Vite: Build Options — modulePreload](https://vite.dev/config/build-options.html#build-modulepreload)
