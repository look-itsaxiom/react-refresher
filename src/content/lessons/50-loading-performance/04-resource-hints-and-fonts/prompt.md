Two pure functions this time — no rendering to grade, just data in and data out. The
default `App` at the bottom just prints what they produce for one example so you can see
it in the preview; you don't need to touch it.

## `planResourceHints`

A route manifest describes, for each route, which JS chunks it needs, its
largest-contentful-paint image (if any), and which routes a user is likely to go to next.
Given the manifest and the *current* route's name, return an ordered list of
`LinkDescriptor`s the page should render as `<link>` tags, in this order:

1. One `{ rel: 'modulepreload', href }` for each of the current route's `chunks`, in the
   order they appear in `chunks`.
2. If the current route has an `lcpImage`, one `{ rel: 'preload', href: lcpImage, as:
   'image', fetchPriority: 'high' }`.
3. One `{ rel: 'preconnect', href }` for each origin in `manifest.thirdPartyOrigins` (in
   order), if that field is present.
4. For each route name in the current route's `nextRoutes` (in order), one `{ rel:
   'prefetch', href, fetchPriority: 'low' }` per chunk of that next route (in `chunks`
   order) — these are lower priority than anything above because they're a guess about
   the future, not something the current page needs.

If the current route isn't in `manifest.routes`, return `[]`.

## `fontStrategy`

Given a list of `FontSpec`s, decide a loading strategy per font and return the CSS to
use:

- A font with `role: 'body'` is on the critical path: `fontDisplay` is `'swap'`,
  `preload` is `true`, and if the spec has `fallbackMetrics`, the returned `css` includes
  **two** `@font-face` blocks — the real font (with `font-display: swap`) and a fallback
  block for `fallbackMetrics.fallbackFamily` (`src: local(<fallbackFamily>)`) carrying
  `size-adjust: <fallbackMetrics.sizeAdjust>%` and, if present, `ascent-override:
  <fallbackMetrics.ascentOverride>%`. Use each font's own `family` for its real
  `@font-face`'s `font-family`, and `` `${family} Fallback` `` for the fallback block's
  `font-family`.
- Any other role gets `fontDisplay: 'optional'` and `preload: false`, with `css` being
  just the one `@font-face` block (no fallback block, even if `fallbackMetrics` is
  present — optional fonts don't need CLS protection since the browser either has them
  in time or never swaps).

Return one result per input font, same order, as `{ family, fontDisplay, preload, css
}`.
