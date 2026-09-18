# Where a token may live

Every place you can put an access or refresh token in a browser trades one attacker
capability for another. There's no storage location that's safe against everything — the
question is always "safe against *what*," which means the right first step is naming the
attacker capabilities you're weighing:

| Capability | What it gets you |
|---|---|
| **XSS** | arbitrary JS execution in the page's origin |
| **CSRF** | the ability to make the *browser* fire a request it will auto-authenticate |
| **Physical device access** | reading whatever's on disk while the device is unlocked |
| **Other same-origin tabs** | reading whatever storage is shared across tabs |
| **A malicious/compromised extension** | broad page access, and for cookies, often more — the `chrome.cookies` API can read `HttpOnly` cookies that page JS never could |

## Why `localStorage` and `sessionStorage` tokens fail

Both are plain JS-readable storage scoped to the origin. That scoping is the Same-Origin
Policy doing its job — but a successful XSS payload runs *inside* that same origin, so
the isolation that keeps `evil.example` out does nothing against a script your own page
just executed by accident. This is the OWASP-documented anti-pattern: `localStorage`
gives an XSS payload a token that survives tab closes and browser restarts, with no way
to mark it `HttpOnly` the way a cookie can be. `sessionStorage` narrows the *persistence*
(cleared when the tab closes, not shared with other tabs) but does nothing about the
*readability* — an XSS payload reads it exactly as easily.

## In-memory tokens plus silent refresh

Holding the access token in a JS variable (a module-level closure, a ref, state that
never touches storage) means it's still readable by XSS *while that XSS payload runs*,
but it leaves nothing behind: no disk artifact, nothing another tab or a later session
can find. The cost is that a reload loses it, so this pattern is always paired with a way
to get a new one — a "silent refresh" that exchanges a longer-lived credential (usually a
refresh token) for a fresh access token on load, without a visible redirect.

## `HttpOnly` cookies and the CSRF trade

An `HttpOnly` cookie can't be read by `document.cookie`, so XSS can't exfiltrate it
directly. What it can still do is *ride along automatically* — and that automatic
attachment is exactly what CSRF exploits. Putting a refresh token in an `HttpOnly`,
`Secure`, `__Host-`-prefixed cookie removes it from the XSS attack surface but reopens the
CSRF one, so it has to be paired with the defenses from lesson 66: `SameSite`, an Origin
or Fetch Metadata check on the refresh endpoint, or a synchronizer token. Neither
mitigation alone is complete — that's the point of defense in depth here, not a gap to
close with one more attribute.

## The BFF pattern

The strongest option is to not give the browser a token at all: the Backend-for-Frontend
holds the real tokens server-side and gives the browser only a session cookie scoped to
*your own* backend. XSS in the SPA can still ride that session cookie to make requests
through your BFF, but it can never read or exfiltrate the underlying provider token,
because the browser never had it. Lesson 69 covers the BFF pattern's shape in full; the
token-storage takeaway is narrower: a BFF isn't one storage option among several, it's a
way to opt out of the browser-storage question for the tokens that matter most.

## Workers as a partial mitigation

Running the token-holding logic in a dedicated Worker (or having a Service Worker act as
a network proxy that attaches the `Authorization` header itself) keeps the token out of
the main thread's global scope, so a `<script>` an attacker injects into the page can't
reach it by walking `window`. It's a narrowing, not an elimination: the main thread can
still ask the worker to make an authenticated request on its behalf via `postMessage`, and
if that messaging channel isn't validated, a compromised main thread can proxy arbitrary
requests through the worker just as effectively as if it held the token itself.

## Mobile WebViews

Inside a WebView, the web rules still apply exactly as in a browser tab: `localStorage`
is still JS-readable by any script that runs there, `HttpOnly` cookies still resist
`document.cookie`. The difference is that native platforms offer storage the web has no
equivalent for — the iOS Keychain, the Android Keystore — which live outside the
WebView's JS-reachable surface entirely. If the app has a native shell, prefer native
secure storage for anything long-lived over any JS-reachable option inside the WebView.

## Logout and multi-tab sync

A token that only lives in memory is, by construction, private to one tab — which means
logging out in tab A doesn't automatically tell tab B anything. Two mechanisms exist to
bridge that: writing to `localStorage` fires a `storage` event in *other* same-origin
tabs (never the tab that wrote it), which is enough to broadcast "something changed" even
if the value itself never holds a token; `BroadcastChannel` does the same job with an
explicit message channel instead of overloading a storage write. Either way, each tab
reacts by dropping its own in-memory token and, if a cookie's involved, calling an
endpoint that clears it server-side — the broadcast coordinates the tabs, it doesn't do
the logout itself.

## The concrete recommendation

For a client-rendered SPA: access token in memory, refresh token in an `HttpOnly`,
`Secure`, `__Host-`-prefixed cookie scoped tightly to the refresh endpoint, with an
explicit CSRF defense on that endpoint — or, better, delegate the whole problem to a BFF
and give the browser nothing but a session cookie. For a server-rendered app (Next.js,
React Router), the server that renders your pages is already positioned to be that BFF:
read the session cookie in server-only code — `cookies()` from `next/headers` in a Next.js
server component or route handler, or the request's `Cookie` header in a React Router
loader/action — and never let a provider token cross into a client bundle. Client-side
code calls your own same-origin routes, which hold the real credential, instead of ever
holding one itself.

## Further reading

- [OWASP: HTML5 Security Cheat Sheet — local storage](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: Window.postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [MDN: Storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)
