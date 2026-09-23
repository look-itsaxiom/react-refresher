# HTTPS everywhere, actually

You already know the TLS/QUIC handshake mechanics from [How the web works](../25-how-the-web-works). This step is about what that encrypted channel actually buys you, what it doesn't, and the operational reality of running HTTPS in 2026.

## What TLS protects, and what it doesn't

TLS gives you confidentiality and integrity for the bytes between the client and whichever server terminates the connection — which might be a CDN edge, not your origin. That's a narrower guarantee than "my traffic is private":

- **Metadata leaks around the encrypted payload.** The server name (SNI) is sent in cleartext during the handshake by default, so a network observer still learns which *site* you're visiting even though not *what* you're doing there. Encrypted Client Hello (ECH) hides SNI too, but support is still uneven across CDNs and browsers as of 2026 — don't assume it's on for your stack without checking.
- **DNS is a separate, usually-plaintext channel.** Resolving `example.com` to an IP over classic UDP port 53 DNS is visible to anyone on that path, independent of how the eventual HTTP request is protected. DNS-over-HTTPS (DoH) or DNS-over-TLS (DoT) close that gap, but plenty of traffic still resolves over plain DNS.
- **Traffic analysis survives encryption.** Packet sizes and timing can fingerprint which page on a site you loaded even when the payload itself is opaque.
- **TLS 1.3 is table stakes now**, and browsers are rolling out post-quantum key exchange (`X25519MLKEM768`) as a default alongside classical ECDHE — worth knowing exists, not something you configure yourself unless you run your own TLS termination.

None of this means TLS is weak — it means "HTTPS" answers "is this connection encrypted and unmodified," not "is this visit private." Keep those two questions separate when you reason about what an attacker on the network can actually learn.

## Certificates in 2026: short-lived and automated

Certificate lifetimes have been shrinking on a CA/Browser Forum schedule (Ballot SC-081) for exactly this reason: a shorter maximum validity limits how long a mis-issued or compromised certificate stays useful, and forces the domain-validation evidence behind it to be re-checked more often. The trend to plan around — check the current CA/B Forum ballot for exact dates, since this schedule has moved before — is roughly: 398 days as the long-standing default, then a step down toward 200 days, then 100, with a further drop toward the 47-day range by the end of the decade.

The practical consequence is not "certificates expire faster," it's **manual certificate renewal stops being viable**. A team that renews by hand once a year cannot renew every 47 days without dropping something. ACME clients (`certbot`, `acme.sh`), cert-manager on Kubernetes, and platforms that handle it invisibly (Vercel, Cloudflare, most PaaS) turn certificate rotation into a background job instead of a calendar reminder — if you're not already automated, this is the deadline that forces it.

Two more pieces worth knowing:

- **Certificate Transparency (CT).** Every publicly-trusted certificate has to be logged in a public, append-only CT log before browsers will accept it. That's not just an issuance rule — it means you can *monitor* CT logs for your own domains (via `crt.sh` or your CA's dashboard) and catch a certificate you didn't request before an attacker uses it.
- **OCSP is on its way out.** Online Certificate Status Protocol — asking the CA in real time "is this cert still valid" — has privacy and latency problems (it leaks your browsing to the CA, and a slow OCSP responder slows every handshake). The industry direction is toward short-lived certificates that don't need live revocation checking at all: if a cert is only valid for a handful of days, revocation matters much less, because the attacker's window closes on its own.

## HSTS: closing the first-request gap

Even on a site that's HTTPS-only, there's a gap: the very first time a browser navigates to a bare `example.com` or an old `http://` link, it doesn't yet know to upgrade to HTTPS — that request goes out in the clear, and a network attacker in position can intercept it (SSL stripping) before the redirect ever happens.

`Strict-Transport-Security` closes that gap for every visit *after* the first one:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

- `max-age` (seconds) is how long the browser remembers "always use HTTPS for this host," refreshed on every response that includes the header. Two years (`63072000`) is a common floor for a site treating this seriously.
- `includeSubDomains` extends the rule to every subdomain, not just the exact host — required if you ever want `preload`.
- `preload` submits the domain to a static list (`hstspreload.org`) that Chrome, Firefox, and Safari ship baked into the browser itself, so there's no first-request gap *at all*, ever, for anyone. The cost: getting *off* the preload list takes weeks to propagate through browser release channels, and it applies to every subdomain. Don't preload a domain — or a parent domain of one — you might need to run plain HTTP on later.

## HTTPS-first navigation and mixed content

Chrome's HTTPS-First Mode (the "Always Use Secure Connections" setting) upgrades a typed or bookmarked navigation to `https://` before trying `http://`, and warns before falling back. It's been on by default in Incognito and for hosts with no prior HTTP history for a while now, with browsers moving toward it as the default for all browsing — check your target browsers' current rollout rather than assuming full default-on. This is about *top-level navigation*; it's a different mechanism from mixed content blocking, which governs *subresources* on a page that's already loaded over HTTPS.

Once a page is HTTPS, any subresource fetched over plain `http://` is mixed content, and browsers split it into two buckets:

- **Active content** — scripts, stylesheets, fetch/XHR — is blocked outright. No attempt to load it over `http://`, no upgrade attempt, just a console error and a missing resource.
- **Passive content** — images, audio, video — is auto-upgraded to `https://` first. If the `https://` version doesn't exist, it's blocked too, not silently served over `http://`.

`Content-Security-Policy: upgrade-insecure-requests` tells the browser to rewrite every `http://` subresource URL to `https://` *before* even trying, which is the practical fix when you're migrating a page with scattered hardcoded `http://` references instead of chasing them one at a time.

Cookies have their own version of this: a cookie set without the `Secure` attribute is sent over both `http://` and `https://` for its domain, so if *any* endpoint on that domain is reachable over plain HTTP, the cookie leaks there in cleartext even if your main site is all-HTTPS. Set `Secure` on every cookie that doesn't have a specific reason not to.

## Dev-time HTTPS

Browsers special-case `localhost` (and `127.0.0.1`) as a "potentially trustworthy origin," so HTTPS-gated APIs — service workers, geolocation, clipboard access — work over plain `http://localhost` without complaint. That's why most local dev skips certificates entirely.

You still need real HTTPS locally when you're testing something that specifically depends on it: HSTS behavior, `Secure` cookies, or a custom hostname instead of `localhost`. Vite's `server.https` option combined with `mkcert` (which installs a local CA into your OS/browser trust store and issues certificates signed by it) gets you a browser-trusted local certificate without fighting a corporate proxy or a self-signed-cert warning.

## Further reading (optional)

- [MDN: Strict-Transport-Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security)
- [HSTS Preload List submission and FAQ](https://hstspreload.org/)
- [MDN: Mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content)
- [Vite: Server Options (`server.https`)](https://vite.dev/config/server-options.html)
