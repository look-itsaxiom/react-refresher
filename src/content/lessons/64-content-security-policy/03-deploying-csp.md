# Deploying CSP without breaking production

A strict policy shipped straight to `Content-Security-Policy` on a real app
breaks something on the first request, almost every time -- an analytics
snippet, a CSS-in-JS library, a chart library that calls `eval`. The rollout
path exists specifically to find those breakages before they're outages.

## Start with Report-Only, and the Reporting API

`Content-Security-Policy-Report-Only` enforces nothing; it evaluates the
policy against every load and reports violations, but never blocks. Ship
your target policy as Report-Only first, watch the reports for a real
traffic window (days, not minutes -- you want to see every route, every
device class, every A/B variant), fix what shows up, and only then
duplicate the (now quiet) policy into the enforcing `Content-Security-Policy`
header. Keep the enforcing header's directives a subset of what
Report-Only already proved quiet; don't tighten both at once.

Reports need somewhere to go. The old mechanism, `report-uri
<url>`, is deprecated but still the most broadly supported; the current
mechanism is the Reporting API: a `Reporting-Endpoints` header names one or
more endpoints, and the CSP directive `report-to <name>` points at one by
name.

```
Reporting-Endpoints: csp-endpoint="https://reports.example.com/csp"
Content-Security-Policy-Report-Only: script-src 'nonce-r4nd0m' 'strict-dynamic'; report-to csp-endpoint
```

Ship both `report-to` and the older `report-uri` pointing at compatible
endpoints during the transition; a browser that doesn't understand one
falls back to the other rather than reporting nothing. Roll out by route
before rolling out globally -- a marketing site with a dozen embedded
widgets and a logged-in app shell have very different real allowlists, and
enforcing the app shell's tighter policy on the marketing pages first
(where it's cheaper to notice and fix) de-risks the harder surface.

## Generating and propagating a nonce

A nonce has to be fresh per response and reach both the header and every
inline `<script>`/`<style>` tag that response renders, which means it has
to be generated before rendering starts and threaded through whatever
templated or component-rendered the page.

**Next.js 16** generates it in `proxy.ts` (the file that replaced
`middleware.ts` in Next.js 16 -- same request-interception role, renamed),
sets it on both the outgoing `Content-Security-Policy` header and a custom
request header, and Next's own SSR pipeline automatically applies it to
every framework-emitted script and style tag on a **dynamically rendered**
page; static/ISR pages have no per-request nonce to attach, so pages using
nonces must opt into dynamic rendering (`await connection()`) and lose CDN
caching for that page. Reading the nonce back for your own inline content
uses `headers()` in a Server Component; React 19's `<script>` and
`<style>` tags, and `next/script`'s `<Script>`, all accept a plain `nonce`
prop that's applied to the rendered element -- no manual DOM manipulation
needed.

```tsx
import { headers } from 'next/headers';

export default async function Page() {
  const nonce = (await headers()).get('x-nonce');
  return <script nonce={nonce}>{'window.__FLAGS__ = {};'}</script>;
}
```

**Vite 8** in production build mode supports the same idea via the
`html.cspNonce` config option: set it (typically to a per-request
placeholder your server substitutes) and Vite stamps a matching `nonce`
attribute onto every `<script>`, `<style>`, and stylesheet/modulepreload
`<link>` tag it emits, plus a `<meta property="csp-nonce" nonce="...">`
your own runtime code can read to nonce anything it injects afterward.
The classic gap is the **dev server**: Vite's HMR client injects its own
inline bootstrap script into the page, and historically that meant local
development needed `'unsafe-inline'` in `script-src` or the dev experience
broke outright. `html.cspNonce` is honored by the dev server too as of
recent Vite releases, so a dev-only nonce (even a static placeholder,
since dev isn't a security boundary) keeps the dev server's injected tags
compliant with the same policy shape you'll enforce in production --
confirm this against your installed Vite version before relying on it, since
dev-server CSP support has changed across releases.

## Inline styles are the recurring breakage

CSS-in-JS libraries (styled-components, Emotion) and utility frameworks
that inject a `<style>` tag at runtime are the single most common CSP
breakage, because "inline style" reads as lower-risk than "inline script"
but is blocked by the exact same mechanism. Fixes, in order of
preference: move to build-time CSS extraction (Tailwind's compiled output,
vanilla-extract, styled-components' Babel/SWC plugin with static extraction)
so there's no runtime `<style>` injection to allow at all; if that's not
available, most CSS-in-JS libraries added nonce support once CSP adoption
pushed them to -- pass the same per-response nonce you generated for
scripts into the library's provider/config; failing that, hash each
distinct injected stylesheet (`'sha256-...'` in `style-src`) if the output
is stable, though a library that generates unique class hashes per build
will make this brittle across deploys.

## Third-party scripts and Trusted Types enforcement

A tag manager (GTM), analytics snippet, or support widget usually wants to
load more scripts after the first one runs -- exactly what `'strict-dynamic'`
exists for. Nonce the loader script itself; everything it subsequently
inserts inherits trust as a non-parser-inserted script, with no host
allowlist needed. Flip `require-trusted-types-for 'script'` on only after
an audit (or a Report-Only run of `require-trusted-types-for` alone, which
also reports without blocking) confirms every remaining `innerHTML`-family
write in the app and its dependencies goes through a registered policy --
a jQuery plugin, a WYSIWYG editor, or an older analytics snippet calling
`document.write` are the usual holdouts.

## Meta tags and other limits

`<meta http-equiv="Content-Security-Policy" content="...">` works for
directives that make sense purely client-side, but `frame-ancestors`,
`report-uri`/`report-to`, and `sandbox` are **not honored** in a meta tag
-- they require the real response header, because they govern how the
*response itself* may be framed or reported on, a decision that has to be
made before the document (and its meta tags) are even parsed. Reach for a
meta tag only when you truly cannot set response headers (a fully static
host with no server logic); anywhere you control the response, set the
header.

## Common breakages and testing

The recurring list: a chart or templating library calling `eval`/`new
Function` (refactor, or add `'wasm-unsafe-eval'` if it's genuinely
WebAssembly compilation, not general `eval`); web fonts served as `data:`
URIs needing `data:` in `font-src`; an inline `onclick="..."` attribute
needing either a real event listener or `script-src-attr 'unsafe-hashes'`
plus a matching hash; a service worker registration blocked by `worker-src`.
Catch these in CI, not production: run the app under its real headers in
Playwright and assert on `page.on('console')` for CSP violation messages
(Chromium logs them as console errors), or point a Report-Only header at a
local collector during the E2E run and fail the build on any report.

## Further reading (optional)

- [web.dev: Mitigate cross-site scripting (XSS) with a strict Content Security Policy](https://web.dev/articles/strict-csp)
- [MDN: Content-Security-Policy-Report-Only](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only)
- [Next.js docs: Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy)
- [Vite docs: Content Security Policy](https://vite.dev/guide/features.html#content-security-policy-csp)
