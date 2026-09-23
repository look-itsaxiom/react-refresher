# From URL to first byte

You've been shipping React apps for years, which means you've been treating everything below
`fetch()` as someone else's problem — a CDN config, a DevOps runbook, a "just deploy it" black
box. That's mostly fine until it isn't: a slow TTFB you can't explain, a CORS preflight that
shouldn't be there, a cache header that silently serves stale HTML for a day. This lesson is the
part of the stack you skipped. No React here — just what actually happens between a user typing
a URL and your bundle starting to execute.

## Anatomy of a URL, and what "same-origin" really means

`https://app.example.com:443/dashboard?tab=billing#invoices` breaks into: scheme (`https`),
host (`app.example.com`), port (`443`, implicit for `https`), path (`/dashboard`), query
(`tab=billing`), and fragment (`invoices`, never sent to the server). The **origin** is
scheme + host + port, and it's the unit same-origin policy checks — not the domain, not the path.
`app.example.com` and `api.example.com` are different origins even though they share a registrable
domain; `http://example.com` and `https://example.com` are different origins even though nothing
else changed. This is why a same-site cookie can be shared across subdomains (cookies scope by
domain, not origin) while `fetch` from one subdomain to another still triggers CORS (fetch scopes
by origin). Two APIs, two different notions of "same site" — a recurring source of bugs when
people reason about one using the other's rules.

## DNS: resolving the host before anything else can happen

The browser needs an IP address before it can open a connection. The resolution chain, in order:
browser cache → OS resolver cache → recursive resolver (your ISP's or a public one like
1.1.1.1/8.8.8.8) → root nameservers → TLD nameservers → the authoritative nameserver for the
domain. Each record ships with a **TTL**; a `300`-second TTL means every resolver in that chain
can reuse the answer for five minutes before asking again, which is why lowering a DNS TTL is step
one of any migration runbook — you want stale answers to expire fast when you're about to move
things.

Plain DNS is sent unencrypted over UDP port 53, which means any network you're on — the coffee
shop router, a corporate proxy — can see and often rewrite it. **DNS over HTTPS (DoH)** and
**DNS over TLS (DoT)** wrap the same query in an encrypted channel; both are now the default
resolution path in Chrome, Firefox, and Safari for supporting resolvers, and it's part of why ECH
(below) even works — you can't hide the destination in the TLS handshake if you already leaked it
in a plaintext DNS query. `dig +short example.com` still shows you the resolved A/AAAA record
locally; it just doesn't tell you whether the query that produced it was encrypted in transit.

## Getting a connection: TCP+TLS, or QUIC

Historically, reaching an `https://` origin meant two round trips before a single application
byte moved: a TCP three-way handshake, then a TLS handshake on top of it. **TLS 1.3** (RFC 8446,
now the deployed baseline — TLS 1.0/1.1 are dead, 1.2 lingers only for legacy clients) collapsed
its own handshake to one round trip, and added **0-RTT resumption**: if the client has previously
connected to this server and cached its session parameters, it can send encrypted application
data — like the actual HTTP request — in the very first flight, before the handshake finishes.
The tradeoff is that 0-RTT data is replayable by a network attacker, so servers restrict it to
idempotent requests (GETs, not the checkout POST).

**QUIC** (RFC 9000) throws out TCP entirely and rebuilds transport on top of UDP, folding the
transport and TLS 1.3 handshakes into a single round trip. It also fixes TCP's head-of-line
blocking at the transport layer: TCP delivers bytes in one strict sequence, so one lost packet
stalls every stream sharing that connection, even ones with no lost data of their own. QUIC
multiplexes independent streams natively, so a lost packet only blocks the stream it belonged to.
This is the transport HTTP/3 (below) runs on, and it's also why a client that has already talked
to a server can reconnect near-instantly after a network switch (Wi-Fi to cellular) — QUIC
connections are identified by a connection ID, not the four-tuple of IPs and ports, so they
survive the client's address changing mid-session.

Certificates get a one-paragraph treatment: a **CA** (Certificate Authority) signs a certificate
binding a public key to a domain, the browser trusts a fixed list of root CAs, and the server
presents a chain from its leaf certificate up to one of those roots during the handshake. Domain
validation (DV) certificates — what Let's Encrypt issues for free, auto-renewed every 90 days —
now cover the overwhelming majority of the web; extended validation (EV) never got the UI
treatment browsers once promised it and has largely faded from relevance.

## HTTP/1.1 → HTTP/2 → HTTP/3

**HTTP/1.1** sends one request per connection at a time (pipelining existed on paper, never
worked reliably in practice), so browsers opened up to 6 parallel TCP connections per origin to
get concurrency — each paying its own TCP+TLS handshake cost. **HTTP/2** (2015) multiplexes many
requests over a single TCP connection using binary framing, plus **HPACK** header compression to
stop re-sending near-identical headers on every request. But because it's still TCP underneath,
one dropped packet head-of-line-blocks every multiplexed stream — the exact problem HTTP/2 solved
at the application layer reappears at the transport layer. **HTTP/3** (RFC 9114, 2022) is HTTP/2's
semantics carried over QUIC instead of TCP, which finally removes head-of-line blocking at both
layers. Adoption is no longer a bet on the future: as of mid-2026, HTTP/3 is used by roughly a
quarter to nearly 40% of sites depending on how you count (W3Techs vs. Cloudflare edge traffic),
and essentially every modern browser supports it — the variance is in server and CDN rollout, not
client capability.

A side effect worth knowing: **domain sharding** (splitting assets across `img1.example.com`,
`img2.example.com`, etc. to dodge the browser's 6-connections-per-origin cap) actively hurts you
under HTTP/2 and HTTP/3 — one connection already handles unlimited concurrent streams, so sharding
just adds redundant handshakes and defeats **connection coalescing**, where a browser reuses one
connection for multiple hostnames that resolve to the same IP and share a compatible certificate.
Un-sharding assets onto a single origin is now the standard advice, exactly backwards from the
HTTP/1.1 era.

One more piece of the request lifecycle worth naming here: **103 Early Hints** (RFC 8297) lets a
server send preliminary response headers — typically `Link: rel=preload`, — before it has finished
computing the actual response body, so the browser can start fetching render-blocking assets while
the origin is still, say, querying a database. It requires no client-side code, only server/CDN
support, and several major CDNs now emit it automatically for HTML responses.

## Further reading (optional)

- [MDN: What happens when you type a URL](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)
- [web.dev: HTTP/3 for web developers](https://web.dev/articles/http3-for-web-developers)
- [Cloudflare: Encrypted Client Hello](https://developers.cloudflare.com/ssl/edge-certificates/ech/)
- [RFC 9000: QUIC transport protocol](https://www.rfc-editor.org/rfc/rfc9000)
