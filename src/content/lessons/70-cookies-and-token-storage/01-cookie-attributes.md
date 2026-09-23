# Cookies, attribute by attribute

A cookie is the only browser primitive that a server can attach to a request without any
client-side code cooperating. That single property — automatic, script-free attachment —
is why cookies are still the backbone of most auth designs in 2026, and why every
attribute on `Set-Cookie` exists to control *who gets that automatic attachment and
under what conditions*. Lesson 66 covered `SameSite`'s attach rules in depth; this lesson
treats it as one entry in a longer list and spends its time on the attributes that decide
whether a cookie is even safe to call a session token.

## The full attribute list

```
Set-Cookie: __Host-session=abc123; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=900
```

- **`Domain`** — omit it and the cookie is *host-only*: sent only to the exact host that
  set it. Set it (`Domain=example.com`) and the cookie widens to every subdomain,
  `app.example.com`, `marketing.example.com`, all of them. That widening is the mechanism
  behind "cookie tossing": a lower-trust subdomain (a preview environment, a third-party
  CNAME, a compromised marketing site) can set a cookie with the same name and a wider
  `Domain`, and depending on cookie-jar ordering rules it can shadow or collide with the
  one your app reads. The fix is simple — don't set `Domain` unless you genuinely need
  subdomain sharing, and if you do, keep the auth cookie separate from that mechanism.
- **`Path`** — restricts which request *paths* the browser attaches the cookie to. It is
  not a security boundary: any script running on the same origin can read or write the
  cookie via `document.cookie` regardless of `Path`, because `document.cookie` isn't
  scoped by path the way outgoing requests are. Treat `Path` as request-routing hygiene,
  never as isolation between features on the same origin.
- **`Expires` / `Max-Age`** — `Expires` is an absolute date; `Max-Age` is seconds from now.
  Omit both and you get a session cookie, cleared when the browser fully closes (though
  session-restore features mean "closes" is fuzzier than it used to be). When both are
  present, **`Max-Age` takes precedence** per RFC 6265bis — a server sending both should
  expect the browser to honor the seconds-based value.
- **`Secure`** — only sent over HTTPS. In 2026 there is no excuse for an auth cookie
  without it.
- **`HttpOnly`** — invisible to `document.cookie` and to any JS running on the page. This
  is the whole reason cookie-held tokens survive XSS in a way `localStorage`-held tokens
  don't: a script that owns the page still cannot read an `HttpOnly` cookie's value.
- **`SameSite`** — `Strict` / `Lax` / `None`, covered fully in lesson 66. The short version
  for this lesson: `None` requires `Secure`, and a missing attribute defaults to `Lax`.
- **`Partitioned`** — the CHIPS mechanism. A third-party cookie set inside an embedded
  context (an iframe) is partitioned by the *top-level site* embedding it, so the same
  embedded origin gets an independent cookie jar per top-level site instead of one shared
  jar that doubles as a cross-site tracking signal. It's a way to let embedded widgets
  keep working (a chat widget remembering its own open/closed state) without that state
  becoming a tracking vector. `Partitioned` requires `Secure`.
- **`Priority`** — `Low` / `Medium` / `High`, a hint some browsers use for eviction order
  when a domain is near its cookie budget. Rarely worth setting by hand.

## The `__Host-` and `__Secure-` prefixes

Cookie names beginning with `__Host-` or `__Secure-` aren't just convention — compliant
browsers refuse to accept the `Set-Cookie` at all if the attributes don't match:

- `__Secure-` requires `Secure`.
- `__Host-` requires `Secure`, **no** `Domain` attribute, and `Path=/`.

`__Host-` is the strongest default available for a session or auth cookie, because the
browser itself enforces host-only scoping and the safe path — you can't accidentally
widen it later without the browser rejecting the change outright. Start every new auth
cookie as `__Host-<name>` unless you have a specific, named reason not to.

## Size and count limits

Each cookie's `name` + `value` should stay under **4096 bytes** — browsers vary in
exactly how they handle an oversized `Set-Cookie` (silently drop it, truncate it, or
reject it), so don't rely on being close to the edge. Per-domain, RFC 6265 sets a floor of
50 cookies, but real browsers allow far more — Chrome's limit is commonly cited around
180 per domain. The practical concern isn't hitting the count limit; it's that *every*
cookie on a domain rides along on *every* matching request to that domain, so a page with
a dozen tracking, preference, and session cookies pays that header size on every fetch.

## Reading cookies without `document.cookie`

`document.cookie` is synchronous, string-based, and gives you every cookie concatenated
in one blob you have to parse yourself — writing to it sets one cookie per call, with no
structured way to enumerate what's there. The `CookieStore` API (`cookieStore.get`,
`.getAll`, `.set`, `.delete`, plus a `change` event) is async, promise-based, and
structured, and it's reachable from a service worker, where `document.cookie` doesn't
exist at all. As of 2026 it ships in Chromium-based browsers but not in Firefox or
Safari, so treat it as progressive enhancement, not a baseline you can rely on across
browsers.

## The server side

A session cookie's *value* should be either an opaque random identifier that the server
looks up (the common case), or a signed/encrypted blob if you need to avoid a server-side
lookup — signed so tampering is detectable, encrypted if the contents shouldn't be
readable by the client at all. Either way, keep the signing secret rotatable: rotation is
what lets you invalidate every outstanding session cookie at once during an incident,
independent of each cookie's own expiry.

## Further reading (optional)

- [MDN: Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [MDN: Set-Cookie header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [MDN: CookieStore API](https://developer.mozilla.org/en-US/docs/Web/API/CookieStore)
- [CHIPS (Partitioned cookies) explainer](https://privacycg.github.io/CHIPS/)
