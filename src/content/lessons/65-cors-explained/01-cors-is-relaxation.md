## CORS is the server relaxing the browser's rule

Lesson 62 covered the same-origin policy (SOP): a script on `https://app.example.com` can send
a cross-origin request with ambient cookies, but the browser withholds the *response body* from
that script unless the target origin opts in. CORS — Cross-Origin Resource Sharing — is that
opt-in mechanism: a set of response headers a server sends to tell the browser "it's fine, let
the calling page read this." CORS is enforced entirely by the browser; the server just answers
questions the browser asks. A server cannot force a browser to block or allow anything — it can
only answer honestly, and a misconfigured answer is a real vulnerability, not a compliance
checkbox.

### Simple requests need no permission slip

The Fetch standard defines a **CORS-safelisted request**, informally called a "simple request,"
as one the web already allowed *before* CORS existed (plain HTML forms could always POST
cross-origin) so preflighting it would break the existing web. A request is simple only if
**all** of these hold:

- Method is `GET`, `HEAD`, or `POST`.
- Every header is one of five CORS-safelisted headers: `Accept`, `Accept-Language`,
  `Content-Language`, `Content-Type`, `Range` — and no custom header (`X-Api-Key`,
  `Authorization`, etc.) is present.
- `Accept`, `Accept-Language`, and `Content-Language` values are each **at most 128 bytes** and
  contain no CORS-unsafe bytes (control characters, `"():<>?@[\]{}`).
- If `Content-Type` is set, its MIME type (ignoring the `charset`/`boundary` parameter) is one of
  exactly three values: `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`.
- The request body is not a `ReadableStream`, and no listener is registered on
  `XMLHttpRequest.upload` (both signal the browser needs more control over the request than a
  fire-and-forget send).

Send `fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body:
JSON.stringify(x) })` cross-origin — the single most common accidental trigger — and you've
already left "simple": `application/json` isn't one of the three allowed `Content-Type` values.

### Everything else gets a preflight

A request that fails any of the simple-request rules is **preflighted**: before sending the real
request, the browser sends an `OPTIONS` request of its own, with no body, asking the server for
permission:

```http
OPTIONS /api/orders HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: content-type, x-api-key
```

The server answers with what it allows:

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: content-type, x-api-key
Access-Control-Max-Age: 600
Vary: Origin
```

Only if the browser is satisfied — the method it wants is in `Access-Control-Allow-Methods`,
every non-safelisted header it wants is in `Access-Control-Allow-Headers`, and
`Access-Control-Allow-Origin` matches — does it send the real `PUT` request at all. The
preflight is a separate round trip the actual endpoint usually never sees directly; a common
mistake is implementing the real handler to also serve `OPTIONS`, when the framework or a
dedicated middleware should intercept it and answer generically.

`Access-Control-Max-Age` lets the browser skip repeating a preflight for the same
method+headers+origin combination for a while, but the value is a ceiling suggestion, not a
guarantee: Chromium caps it at 7200 seconds (2 hours) and Firefox at 86400 seconds (24 hours),
silently clamping anything higher, with a 5-second default when the header is absent.

### Credentials and the `*` rule

By default, `fetch` does not send cookies cross-origin. `credentials: 'include'` turns that on —
and the moment credentials are in play, the rules tighten:

- `Access-Control-Allow-Origin` **cannot be `*`**. It must be one specific origin, byte-for-byte
  (scheme + host + port). A server that supports multiple allowed origins has to look at the
  request's `Origin` header and echo back that exact value if (and only if) it's on an allowlist
  — never reflect it unconditionally, which turns your CORS config into "any website can read
  this as the logged-in user."
- The response must also include `Access-Control-Allow-Credentials: true`. Missing it fails the
  check even if the origin matches.
- Whenever the allowed origin is computed dynamically (an allowlist lookup rather than a fixed
  string), the response needs `Vary: Origin` — otherwise a shared cache (CDN, browser disk
  cache) can serve origin A's permissive response to origin B.

`credentials: 'same-origin'` (the default) sends cookies only same-origin; `'omit'` never sends
them. None of this is about "does the frontend send an `Authorization` header" — that's just a
request header like any other and triggers a preflight because it's not safelisted, independent
of `credentials`.

### `no-cors` is not a bypass

`fetch(url, { mode: 'no-cors' })` does not skip CORS — it accepts defeat in advance. The request
still goes out, but the response you get back is **opaque**: `response.type === 'opaque'`,
`status` is always `0`, and you cannot read the body, headers, or real status, ever, regardless
of what the server sends. It exists for genuine fire-and-forget cases (a `<link rel=prefetch>`we
can't otherwise express) — reaching for it to silence a CORS error just means your code runs
without a visible error and without the data it wanted.

### `crossorigin` on markup, and the read-blocking side

CORS also governs plain HTML, not just `fetch`:

- `<script crossorigin src="https://cdn.example.com/lib.js">` — without `crossorigin`, a runtime
  error thrown inside that script reports as `Script error.` with no stack, because the browser
  won't let you read into another origin's script details unless the response carries a CORS
  header (Subresource Integrity requires `crossorigin` for the same reason: the browser needs a
  CORS-cleared response to safely expose the bytes it hashed).
- `<img crossorigin src="...">` — needed before you can draw that image onto a `<canvas>` and
  call `.getImageData()` or `.toDataURL()`; without it the canvas becomes **tainted** and those
  reads throw a `SecurityError`.
- `<link rel="preload" as="font" crossorigin>` — fonts are always fetched in CORS mode by spec,
  `crossorigin` or not, so a font file with no CORS headers simply fails to load cross-origin.
- `Timing-Allow-Origin` on a resource's response is what unlocks the detailed
  `PerformanceResourceTiming` fields (`domainLookupStart`, `responseStart`, etc.) for cross-origin
  resources in the Resource Timing API; without it you get a redacted, mostly-zeroed entry.

The other half of the platform's cross-origin story runs the opposite direction: **CORB**
(Cross-Origin Read Blocking) and its successor **ORB** (Opaque Response Blocking) are browser
heuristics that block a page from ever receiving certain cross-origin response bodies (JSON,
HTML) requested via `<img>`/`<script>`-style no-cors loads, even before CORS headers are
checked — a defense against a compromised or buggy page trying to exfiltrate another origin's
data through a side channel. **CORP** (`Cross-Origin-Resource-Policy: same-origin | same-site |
cross-origin`) is the response header a server sets to opt a resource *out* of being loadable
cross-origin at all, independent of CORS — it protects the resource from being embedded, where
CORS controls whether the embedding page's script can read it.

### Further reading

- [MDN: Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [MDN: CORS-safelisted request header](https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_request_header)
- [MDN: Access-Control-Max-Age](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Max-Age)
- [MDN: Cross-Origin Resource Policy (CORP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Resource-Policy)
