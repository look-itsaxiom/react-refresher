## Framing, windows, and isolation

CSRF exploits the browser sending requests it shouldn't. This section is about the
other half of "not isolated by design" from lesson 62: a page can embed your page, open
a window from your page, and message across window boundaries — and all three defaults
favor interoperability over safety.

### Clickjacking and UI redressing

Clickjacking loads your page in an invisible or disguised iframe on the attacker's site,
then positions it under something the victim is tricked into clicking — a fake "play
video" button sitting exactly over your real "Delete account" or "Authorize transfer"
button. The victim's click lands on *your* page, fully authenticated with their real
session, having "clicked" your control while believing they clicked the decoy. No
script injection is needed; the attacker never touches your origin's data, they just
frame it and lie about what's visible.

The fix is telling the browser who may frame you at all:

- **`X-Frame-Options`** — the legacy header, values `DENY` (never frameable) or
  `SAMEORIGIN` (only your own origin may frame you). It has no way to allow a specific
  *list* of other origins, which is why it's legacy rather than gone.
- **`Content-Security-Policy: frame-ancestors`** — the modern replacement, taking `'none'`,
  `'self'`, or a list of origins (`frame-ancestors 'self' https://partner.example`).
  **When both headers are present, browsers honor `frame-ancestors` and ignore
  `X-Frame-Options`** — so once you're setting CSP for other reasons (lesson 64), the
  `frame-ancestors` directive is the one that actually governs framing; keep
  `X-Frame-Options` only for the rare client that doesn't parse CSP.

The default, if you set neither, is that anyone can frame you. That's not a conservative
default; it's the platform assuming embedding is fine until you say otherwise, same as
CORS assumes fetching is *not* fine until you say otherwise, in the opposite direction.

Legitimate embedding still exists — a widget you intend partners to iframe, a payment
form your own checkout embeds cross-origin on purpose. That's exactly where `SameSite=None;
Secure` cookies and CHIPS partitioned cookies (`Set-Cookie: ...; Partitioned`) come in:
a partitioned cookie is scoped to the combination of (its own domain, the top-level
site embedding it), so the same widget embedded on `siteA.example` and `siteB.example`
gets two independent cookie jars instead of one that correlates the user across both —
closing a tracking vector without breaking the embed's own state.

### The site-isolation headers

Spectre (lesson 62) meant same-process isolation by origin wasn't enough; three headers
formalize the stronger, opt-in isolation a page can request:

- **`Cross-Origin-Opener-Policy` (COOP)** — controls whether windows you open, or that
  open you, keep a live script reference to each other. `unsafe-none` (the default)
  keeps the old behavior: `window.open()` gives the popup a `window.opener` back to you,
  and (subject to the `noopener`/`_blank` default below) you can often reach back too.
  `same-origin` severs that link entirely for any cross-origin window — a new browsing
  context group forms, and `window.opener` on the far side is `null`. This is also the
  prerequisite for cross-origin isolation, below.
- **`Cross-Origin-Embedder-Policy` (COEP)** — requires every cross-origin resource *you*
  embed (images, scripts, iframes) to explicitly declare it's fine being embedded, via
  CORP or a CORS response. `require-corp` blocks anything that doesn't opt in;
  `credentialless` is the more deployable alternative — it still loads resources that
  didn't opt in, but strips credentials (cookies, client certs) from those requests
  instead of blocking them outright, which avoids breaking third-party embeds that will
  never add a CORP header for you.
- **`Cross-Origin-Resource-Policy` (CORP)** — the opt-in a resource sets on *itself*:
  `same-origin`, `same-site`, or `cross-origin`, declaring who's allowed to load it as a
  subresource. This is what COEP's `require-corp` is checking for on everything you pull in.

Setting **COOP: `same-origin`** together with **COEP: `require-corp`** (or
`credentialless`) on your top-level document is what grants `self.crossOriginIsolated
=== true` — and only that combination. A weaker COOP value like
`same-origin-allow-popups` (which exists specifically so a page that opens
OAuth-style popups can do so without giving up isolation for its main window) does not
unlock cross-origin isolation, because it still permits some live cross-origin window
relationships. Cross-origin isolation is what gates `SharedArrayBuffer` and
high-resolution timers (`performance.now()` at full precision) — both were throttled or
removed from unisolated pages after Spectre because a script with shared memory and a
precise clock can time cache access patterns across the process boundary and infer data
it was never granted the right to read.

### XS-Leaks: the residual channel

Even without any of that, a page can leak yes/no bits about another origin's state
through side channels that were never plugged by SOP: whether a cross-origin frame
successfully loaded (frame counting — "is this URL a 404 or a real page, i.e. is this
user logged into that service"), how long a resource took to respond, whether a
`window.open` call succeeded or was blocked by a popup blocker (implying something about
the target's redirect chain), or CSS `:visited` styling differences. These are called
XS-Leaks, and they're why "no vulnerability, just information" attacks still make it
into bug bounty reports for sites with airtight CSP and CORS. `frame-ancestors`, COOP,
and CORP each close specific XS-Leak channels as a side effect of their main job — one
more reason to set them even on pages that "don't have anything an iframe would want,"
since the attacker's goal here is inference, not extraction.

### `window.opener` and `postMessage`

Two smaller platform defaults worth naming explicitly. First: modern browsers (Chrome
88+, Firefox 79+) treat `<a target="_blank">` as implicitly `rel="noopener"` even
without writing it — the opened tab gets no `window.opener` back-reference by default.
This closed a long-standing "target=_blank tab-nabbing" bug class where the new page
could navigate the opener to a phishing look-alike. You can still opt back in with
`rel="opener"` if you deliberately need the reference; `window.open()` calls from script
don't get this default and still need an explicit `noopener` (or `noopener,noreferrer`)
in the features string if you don't want the reference kept.

Second: `postMessage` has no origin restriction unless the code enforces one. Any window
that holds a reference to yours — an iframe you embedded, a popup you opened, or one
that opened you — can call `yourWindow.postMessage(data, targetOrigin)`, and your
`message` listener receives it regardless of who sent it unless you check
`event.origin` against an allowlist before trusting `event.data`. Sending with a target
origin of `'*'` is the mirror mistake: it hands the message to whatever origin the
window happens to be showing at delivery time, which can change between when you called
`postMessage` and when the browser delivers it (a redirect in flight). Both directions —
checking on receive, naming a specific origin on send — are required; either one alone
leaves a gap.

## Interview angle

This lesson is where you show CSRF, clickjacking, and CORS are three different jobs, not one
"web security" blob — that distinction from lesson 65 is exactly the kind of precision a
defense-adjacent product needs. Given that this program shares a single project across a
customer, vendors, and partners, cookie-based sessions crossing company boundaries make
`SameSite`, an Origin or Fetch Metadata check, and `frame-ancestors` all load-bearing rather than
optional. If the product ever embeds a shared view inside a partner's own portal, that's a
legitimate framing use case, so be ready to talk about scoping `frame-ancestors` to a real
allowlist instead of leaving it open by default. Speak concretely about `postMessage` too: if the
UI ever needs to communicate across windows, for an OAuth-style popup connecting a vendor's tool,
say, both directions have to be checked — an explicit target origin on send and an `event.origin`
check on receive, not just one.

**Likely follow-up:** If a partner company wants to embed one of your project views inside their
own internal tool, how do you allow that framing without reopening clickjacking against everyone
else?

**Pitfall:** Treating `SameSite=Lax` as a complete CSRF defense on its own, or assuming CORS
already covers this. `SameSite` is the floor, not the whole defense, and CORS says nothing about
a form POST or an image tag riding the browser's ambient session cookie. Candidates who conflate
the two usually haven't designed a session-cookie-based system under real cross-origin pressure.

### Further reading (optional)

- [MDN: CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors)
- [web.dev: Why you need cross-origin isolation](https://web.dev/articles/why-coop-coep)
- [MDN: Cross-Origin-Opener-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy)
- [XS-Leaks Wiki](https://xsleaks.dev/)
