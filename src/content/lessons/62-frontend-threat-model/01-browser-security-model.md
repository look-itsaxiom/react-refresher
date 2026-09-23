## What the browser protects, and what it does not

Every other lesson in this track is about a specific defense — CSP, CORS, SameSite
cookies. Before any of that, you need the model underneath: what the browser isolates
for you by default, what it deliberately leaves open, and which of those gaps are load-
bearing features rather than bugs.

### Origin and site are different boundaries

An **origin** is the tuple `(scheme, host, port)` — `https://app.example.com:443` and
`http://app.example.com` are different origins even though a human reads them as "the
same site." A **site** is coarser: the registrable domain plus scheme (roughly,
`eTLD+1`), so `app.example.com` and `checkout.example.com` are different origins but the
same site. This distinction matters because the platform uses both, for different
things:

- The **same-origin policy (SOP)** — the browser's oldest security boundary — gates by
  *origin*. A script running on `https://a.example.com` cannot read the DOM, `localStorage`,
  `sessionStorage`, or IndexedDB of `https://b.example.com`, and a `fetch` to another
  origin gets its response body withheld from JavaScript unless that origin opts in via
  CORS.
- **Cookies** run on a mostly separate, older model. By default a cookie set on
  `example.com` is sent with requests to *any* subdomain, and — critically — SOP does not
  stop a cross-origin request from being *sent* with the browser's ambient cookies; it
  only stops the response from being *read*. That gap is what CSRF exploits, and it is
  why `SameSite` (site-scoped, not origin-scoped) exists as a second, independent
  control (lesson 66).
- **Storage partitioning**, rolling out across browsers since 2023-2024, further keys
  third-party storage and network state by the *top-level site*, so an embedded tracker
  on `a.com` and the same tracker embedded on `b.com` no longer share state — a privacy
  boundary, not a security one, but one that changes what a third-party script can
  correlate.

### What SOP isolates, and what it explicitly does not

Isolated by origin: the DOM, `document.cookie` (read access is origin-scoped even though
send behavior is site-scoped), `localStorage`/`sessionStorage`/IndexedDB, and — via
CORS — the *readable* body of a cross-origin `fetch`.

Not isolated, by design:

- **Sending** a cross-origin request with ambient credentials (the CSRF gap above).
- **Top-level navigation.** Any page can navigate the top-level window to any URL
  (`location.href = ...`), and any link can be clicked. This is how phishing works — it
  needs no vulnerability, just a convincing destination.
- **Embedding.** By default any page can be framed by any other page. `X-Frame-Options`
  and CSP's `frame-ancestors` are the opt-in controls that stop it (lesson 66,
  clickjacking).
- **Timing.** Cross-origin resources can leak information through how long they take to
  load, load errors versus success, or memory pressure — the class of attack Spectre made
  practical enough that browsers shipped new headers for it.

### The post-Spectre isolation headers

Spectre (2018) showed that speculative execution lets a malicious script infer memory
contents across the process boundary it's supposed to be confined to — which meant
*same-process* cross-origin isolation wasn't enough anymore; origins needed separate
OS processes, and even then, shared-memory APIs (`SharedArrayBuffer`, high-resolution
timers) needed gating. Three headers formalize this:

- **COOP** (`Cross-Origin-Opener-Policy`) stops other windows/tabs your page opens (or
  that open it) from holding a live JavaScript reference to your `window`, forcing a new
  browsing context group — this is what makes "cross-origin isolation" available at all.
- **COEP** (`Cross-Origin-Embedder-Policy`) requires everything *you* embed (images,
  scripts, iframes) to explicitly opt in via CORP or CORS, so you can't be forced into
  sharing a process with something that didn't consent to it.
- **CORP** (`Cross-Origin-Resource-Policy`) is the opt-in a resource sets on itself
  (`same-origin`, `same-site`, or `cross-origin`) to declare who's allowed to embed it.

Set COOP + COEP together and the browser grants `crossOriginIsolated`, which unlocks
`SharedArrayBuffer` and precise timers for that page — because the browser now trusts
that nothing untrusted is sharing the process.

### CORS and CSP as relaxations, not restrictions

It's easy to misread both as "security features that lock things down." They're the
opposite of SOP's default: **CORS relaxes** the same-origin policy so a server can
deliberately let named origins read its responses; a permissive `Access-Control-Allow-Origin:
*` isn't a bug in the browser, it's the server choosing to open the door (lesson 65).
**CSP restricts** what a page's *own* execution can do — which script sources run, which
domains it can `fetch`/frame/connect to — as a second layer of defense if an attacker
manages to inject markup or script despite everything else (lesson 64). Neither one is
the same-origin policy; both are separate opt-in mechanisms layered on top of it.

### The user is part of the attack surface

Every control above governs what *code* can do to *data*. None of it stops a human
from being deceived: clicking a phishing link that looks like a password reset, approving
an OAuth consent screen for a malicious app, dragging a file into an upload zone that's
actually a hidden clickjacked iframe, or installing a browser extension that has full
DOM access to every page — including yours. Browser extensions in particular run with
your page's origin for `content_scripts` purposes, which means a malicious or compromised
extension bypasses SOP entirely from the user's own browser. Threat modeling that stops
at "what can another origin's script do" misses this; the user's judgment is a
component of your system, and it fails in predictable ways (urgency, authority,
familiarity).

### What the frontend actually has to lose

Concretely, a frontend's assets are: the user's session (cookie or token, whichever this
app uses — lessons 69-71), whatever user data is currently rendered on screen, the
ability to *act as the user* (submit forms, call APIs, spend money) for as long as the
session is live, and the integrity of the code you ship — if an attacker can get their
JavaScript to run as yours, they inherit everything above. Every defense in this track
exists to protect one of those four things.

### Further reading (optional)

- [MDN: Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)
- [web.dev: Why you need cross-origin isolation](https://web.dev/articles/why-coop-coep)
- [MDN: Cross-Origin-Resource-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Resource-Policy)
- [MDN: Storage partitioning](https://developer.mozilla.org/en-US/docs/Web/Privacy/Guides/Storage_partitioning)
