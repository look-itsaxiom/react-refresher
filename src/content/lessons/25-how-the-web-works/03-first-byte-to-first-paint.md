# From first byte to first paint, and where your code runs

Once bytes start arriving, two things matter: what shape they came in (status, headers), and what
infrastructure decided to serve them from where. This step covers both, then hands off to the next
lesson's territory — parsing, the render tree, and paint.

## Request and response anatomy

Every HTTP exchange has a request line (method, path, version), headers, and an optional body; the
response mirrors that with a status line instead. The methods a frontend developer actually
reaches for: `GET` (safe, cacheable, no body), `POST` (not safe, not idempotent — retrying it can
double-submit), `PUT`/`PATCH` (idempotent vs. partial update), `DELETE`. Status codes worth
knowing cold, grouped by what they mean for your code:

- **2xx** — `200 OK`, `201 Created` (check the `Location` header for the new resource), `204 No
  Content` (successful, deliberately no body — don't try to `.json()` it).
- **3xx** — `301`/`308` permanent redirects (browsers and caches remember these; get the wrong one
  cached and you're stuck until it expires), `302`/`307` temporary, `304 Not Modified` (the
  response to a conditional `GET` telling the browser its cached copy is still good — no body).
- **4xx** — `400` bad request shape, `401` unauthenticated, `403` authenticated but forbidden,
  `404`, `409 Conflict` (optimistic concurrency, version mismatches), `429 Too Many Requests`
  (check `Retry-After`). These are the client's fault; retrying the same request unchanged won't
  help.
- **5xx** — `500`, `502 Bad Gateway` (upstream server misbehaved), `503 Service Unavailable`
  (often deliberate, during deploys), `504 Gateway Timeout`. These are often transient — safe to
  retry with backoff, unlike 4xx.

That 4xx/5xx distinction is exactly the judgment call a retry policy has to encode: retrying a
`404` or `401` forever wastes time and can amplify an outage, while giving up on the first `503`
throws away requests a moment's backoff would have saved.

## Headers you actually touch

Ignore the hundred headers you never set by hand and focus on four families. **Caching**:
`Cache-Control: max-age=31536000, immutable` for hashed static assets, `no-cache` (which, despite
the name, means "revalidate before using," not "don't cache") for HTML that changes per deploy,
and `ETag`/`If-None-Match` for conditional revalidation — the browser sends back the tag it was
given, the server answers `304` if nothing changed. **Content negotiation**: `Accept`,
`Accept-Language`, and `Content-Type` on the way in; `Content-Type` and `Vary` (telling caches
which request headers change the response — get `Vary: Accept-Encoding` wrong and a CDN can serve
a gzip response to a client that asked for brotli) on the way out. **Cookies**: `Set-Cookie` with
`HttpOnly` (invisible to JS, mitigates XSS token theft), `Secure` (HTTPS only), and `SameSite`
(`Strict`/`Lax`/`None`) controlling cross-site sending — the CSRF-relevant knob, and the one that
interacts with the same-site-vs-same-origin distinction from the previous step. **Security
headers**: `Content-Security-Policy`, `Strict-Transport-Security` (HSTS, forces HTTPS for future
visits), `X-Content-Type-Options: nosniff` — worth recognizing in a network tab even before a
later lesson covers them in depth.

## Hosting models: where the response actually comes from

An **origin server** is the one system of record for a resource — a single app server, a
container behind a load balancer, whatever runs your backend code. Almost nothing scales by
serving every request from the origin directly, so a **CDN** sits in front: a network of edge
**points of presence (PoPs)** geographically close to users, caching origin responses and serving
them locally so a user in Singapore doesn't round-trip to a server in Virginia for a cacheable
asset. The origin is only hit on a cache miss or for content marked non-cacheable.

**Edge functions** (Cloudflare Workers, Vercel Edge Functions, similar) push actual compute — not
just cached bytes — into those same PoPs: code that runs close to the user for things like auth
checks, A/B routing, or request rewriting, without a round trip to a distant origin. They typically
run in a restricted, non-Node runtime (V8 isolates, not full OS processes) for fast cold starts, which
is why they can't do everything an origin server can (no arbitrary native modules, tighter CPU/time
limits).

A **"static host"** (Netlify, Vercel, GitHub Pages, an S3 bucket, this course's own dev server in
production form) is really just a CDN pointed at a bucket of pre-built files with no origin compute
behind it at all: every request is a cache lookup, a miss falls through to storage instead of a
running server, and the deploy step is "upload new files, invalidate the old cache keys" rather
than "restart a process." That's the entire trick behind why static hosting is fast and cheap: there's
no request that ever waits on your code running.

## Where this hands off

Once the browser has the HTML response in hand, everything from here — parsing bytes into a DOM,
building the render tree, layout, paint, compositing, and the event loop that ties rendering to
your JavaScript — is the next lesson's subject. The line between "how the web works" and "how
browsers render" is exactly the line between this step and that one: this lesson ends when the
first byte of the response body has arrived; the render pipeline starts the moment the HTML parser
sees it.

## Further reading

- [MDN: HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)
- [web.dev: HTTP caching](https://web.dev/articles/http-cache)
- [MDN: Set-Cookie and SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [Cloudflare Learning Center: What is a CDN?](https://www.cloudflare.com/learning/cdn/what-is-a-cdn/)
