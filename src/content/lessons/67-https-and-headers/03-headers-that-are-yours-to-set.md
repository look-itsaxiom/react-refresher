# The headers that are yours to set

HTTPS gets you an encrypted, integrity-checked channel. It says nothing about whether the *content* flowing through that channel is safe to embed, sniff, frame, or trust. That's the job of a handful of response headers you set yourself, on top of TLS.

This lesson covers the baseline set: `Strict-Transport-Security` (from the previous step), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and Subresource Integrity for third-party assets. Three siblings own the rest in depth — `Content-Security-Policy` (CSP), `Cross-Origin-Resource-Sharing` (CORS), and `frame-ancestors`/COOP/COEP/CORP — so treat those here as pointers, not tutorials.

## X-Content-Type-Options: nosniff

Browsers used to (and to a lesser extent still can) *sniff* a response's actual content instead of trusting its declared `Content-Type` — peeking at the bytes to guess "this is really HTML" or "this is really a script" even when the server said `Content-Type: text/plain` or `image/png`. That's a real vector: a user-uploaded file your server serves back with a generic content type can get reinterpreted and *executed* as HTML or JavaScript if a browser decides to sniff it that way.

```
X-Content-Type-Options: nosniff
```

This is a one-line, no-downside header: it tells the browser to trust the declared `Content-Type` and never override it. Set it on every response, not just HTML documents — it matters most on the endpoints serving user-controlled content (uploads, generated reports, proxied files).

## Referrer-Policy

Modern browsers already default to `strict-origin-when-cross-origin` — full URL on same-origin requests, origin-only cross-origin, and nothing at all on an HTTPS→HTTP downgrade. Setting the header explicitly is still worth doing: it documents the decision, survives a future browser default change, and lets you go stricter (`no-referrer`, `same-origin`) for a page whose URL itself is sensitive (a password reset link, a search query with someone's name in it).

Two values are regressions rather than choices:

- `unsafe-url` sends the full URL — path and query string included — on every request, cross-origin and on downgrade. It leaks whatever's in your URLs to every third party you request something from.
- `no-referrer-when-downgrade` was the *old* browser default (pre-2020) and still leaks the full URL cross-origin; it only strips the referrer on an HTTPS→HTTP downgrade, which is a much narrower protection than the current default.

## Permissions-Policy

Syntax is feature-by-feature, each with an allowlist of origins that may use it:

```
Permissions-Policy: camera=(), microphone=(), geolocation=(self), browsing-topics=()
```

`()` means nobody — not even your own page — may use that feature; `(self)` restricts it to your own origin; a list of quoted origins allows specific others (useful for an embedded third-party widget that legitimately needs, say, `camera=(self "https://video-widget.example")`). This replaces the older, differently-named `Feature-Policy` header, which you may still see referenced in stale examples.

Beyond the obvious device APIs (camera, microphone, geolocation), it's also where you opt *out* of browser-level tracking features you never asked for: `interest-cohort=()` blocked the old FLoC cohort API (retired in 2022, but the directive still shows up in older security-header checklists), and `browsing-topics=()` does the same for its replacement, the Topics API. Setting these doesn't require you to use the corresponding JavaScript API yourself — a page with no `Permissions-Policy` at all is implicitly opted in to whatever a browser's default policy allows.

## The headers owned elsewhere (pointers only)

- **Content-Security-Policy** — a full policy language for restricting script sources, inline execution, and more. Covered in depth in the CSP lesson; this lesson's scorecard only checks that *a* CSP is present and that it (or `X-Frame-Options`) blocks framing.
- **CORS headers** (`Access-Control-Allow-Origin` and friends) — covered in the CORS lesson.
- **`frame-ancestors`, COOP, COEP, CORP** — the cross-origin isolation and framing-control headers get their own lesson. This lesson's scorecard checks presence, not policy correctness.

## Subresource Integrity

When you load a script or stylesheet from a third-party origin — a CDN-hosted library, an analytics snippet — you're trusting that origin to keep serving exactly the bytes you tested against, forever. That trust has broken in the real world: in 2024, a widely-embedded CDN domain changed ownership and the new owner started serving malware through a script thousands of sites had already embedded, with no code change on any of those sites' end.

```html
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
  crossorigin="anonymous"
></script>
```

`integrity` is one or more hashes of the *exact* expected bytes. If the fetched response doesn't match, the browser refuses to execute the script or apply the stylesheet at all — no silent fallback, no partial execution. `crossorigin="anonymous"` is required alongside it: computing the hash means reading the response bytes, and cross-origin reads are subject to CORS regardless of what you're going to do with them next; without it, the browser can't verify the response and blocks it.

SRI doesn't fit your own build's same-origin bundles, the ones with a content hash already in the filename (`main.a1b2c3.js`, from the caching lesson). That filename hash already guarantees byte-for-byte identity for anyone fetching it — and if your own origin is compromised, the attacker can just serve a new file *and* a matching new `integrity` value in the same deploy, so SRI buys little there while adding a hash-recompute step to every build. SRI earns its keep specifically where you don't control the serving origin.

## Where headers actually get set

None of these are things `<meta>` tags can reliably set (browsers only honor a handful of headers as `<meta http-equiv>`, and none of the ones above). In practice they're set at whichever layer terminates the response closest to the client:

- **CDN/edge rules** — Cloudflare Transform Rules, Fastly VCL, or your CDN's header-injection config, applied uniformly across every route.
- **Framework-level** — Next.js's `headers()` function in `next.config`, applied per route pattern at build or request time.
- **Static hosts' `_headers` file convention** — Netlify and Cloudflare Pages both read a plain-text `_headers` file next to your build output for exactly this.
- **Your own server**, if you're not behind a CDN or framework that does it for you.

One gap worth knowing before it surprises you: Vite's dev server and `vite preview` don't apply your production header configuration — they're for iterating on the app, not modeling your deployed security posture. Don't check "are my headers right" against `localhost:4173`; check it against staging or production, or a config that's actually shared between the two.

## Scanning

Tools like [securityheaders.com](https://securityheaders.com) and the HTTP Observability community successor to Mozilla's Observatory grade a live URL's response headers against roughly the same checklist this lesson's exercise builds by hand. Either can run against a staging URL in CI, which turns "we added the header" from a one-time manual check into a regression test that fails the build if a CDN config change silently drops it later.

## Further reading

- [MDN: X-Content-Type-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options)
- [MDN: Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy)
- [MDN: Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy)
- [MDN: Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)
