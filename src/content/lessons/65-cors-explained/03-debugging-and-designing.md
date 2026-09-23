## Debugging and designing for it

### Read the DevTools error for what it actually says

Chrome's console prints something like:

```
Access to fetch at 'https://api.example.com/orders' from origin 'https://app.example.com'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the
requested resource.
```

The single most common misreading of this line is "the request failed." It didn't. **The
request reached the server, the server processed it, and the response came back — the browser
then refused to hand that response to your JavaScript.** This is why:

- **"It works in Postman/curl but not the browser"** is not a mystery, it's the expected
  outcome. Postman and curl are not browsers; they have no same-origin policy and no concept of
  CORS. A request succeeding outside a browser tells you nothing about whether a browser will
  let a page read the response.
- **"The preflight shows 200 in the Network tab, but the real request is still blocked"** — a
  successful-looking preflight status doesn't mean the preflight *passed*. Check the response
  headers on that `OPTIONS` request specifically: is `Access-Control-Allow-Methods` present and
  does it include your method? Is `Access-Control-Allow-Headers` present and does it include
  every custom header you sent? A `200` or `204` with no CORS headers at all just means some
  handler answered the `OPTIONS` request generically (a catch-all router, a proxy) without
  actually granting anything.
- A `403`/`401` shown as a "CORS error" is often not a CORS problem at all — open the Network
  tab, look at the actual response status and body for the real (non-`OPTIONS`) request. If it's
  `401` with a valid CORS response, that's an auth failure wearing a CORS costume; if there's no
  response at all (`(failed) net::ERR_FAILED`), that might be a DNS/TLS/connection failure, not
  CORS.

### "Just add CORS to the frontend" is a category error

CORS headers are *response* headers, set by whoever controls the server the request targets. A
frontend cannot grant itself permission to read a response — sending `Access-Control-Allow-*`
headers as *request* headers does nothing (they're not real request headers; the browser ignores
them and, being non-safelisted, they'd force a preflight your own server has to answer). If you
don't control the target server, you cannot fix CORS from the browser side at all; you need
either a same-origin proxy or a change on the server.

### A checklist, by phase

| Symptom | Missing/wrong on |
|---|---|
| No `OPTIONS` request in the Network tab at all | Nothing — request was simple; check the actual response phase instead |
| `OPTIONS` fails to reach the server (`net::ERR_FAILED`) | Server/proxy doesn't handle `OPTIONS` — some backends 404 or reject it |
| `OPTIONS` succeeds but real request is blocked, error mentions "method" | `Access-Control-Allow-Methods` on the preflight response |
| `OPTIONS` succeeds but real request is blocked, error mentions a header name | `Access-Control-Allow-Headers` on the preflight response |
| Real request completes, error says "No Access-Control-Allow-Origin" | Missing that header on the *actual* response, not just the preflight |
| Error mentions "wildcard '*' when credential flag is true" | Server sent `Access-Control-Allow-Origin: *` while the request used `credentials: 'include'` |
| Response arrives, but a custom response header (e.g. `X-Request-Id`) reads as `null` in JS | `Access-Control-Expose-Headers` doesn't list it — CORS also gates which *response* headers script can read, beyond the safelisted `Cache-Control`, `Content-Language`, `Content-Type`, `Expires`, `Last-Modified`, `Pragma` |

### Server-side patterns that don't create a new vulnerability

- **Allowlist, then echo — never reflect blindly.** `Access-Control-Allow-Origin:
  <whatever Origin header showed up>` for every request is the single most common CORS misuse:
  it looks like it "just works" for every caller, and with `Access-Control-Allow-Credentials:
  true` alongside it, it means any website on earth can read authenticated responses as the
  visiting user. Compare the incoming `Origin` against a fixed allowlist and only then echo it.
- **`Vary: Origin`** on every response whose `Access-Control-Allow-Origin` value depends on the
  request — otherwise an intermediate cache can serve one origin's permissive response to a
  different one.
- **Answer `OPTIONS` centrally**, before it reaches route handlers, with a consistent status
  (`204` is conventional) and a `Access-Control-Max-Age` sized to your actual header/method
  churn — a large value cuts preflight round trips but also means a revoked header/method takes
  longer to take effect for callers with a cached preflight.
- **Don't preflight-approve more than you serve.** `Access-Control-Allow-Methods: *` combined
  with an endpoint that only implements `GET` just means CORS isn't the thing stopping a caller
  from trying `DELETE` — your router or auth layer still has to reject it.

### The alternative: don't cross origins at all

A backend-for-frontend (BFF) or reverse proxy puts your API behind the *same* origin as your
page, so the browser never treats the call as cross-origin — no preflight, no
`Access-Control-*` headers, nothing to misconfigure. In development, Vite's built-in proxy does
this for you:

```ts
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': { target: 'https://api.example.com', changeOrigin: true },
    },
  },
});
```

The page calls `fetch('/api/orders')` — same-origin from the browser's point of view — and Vite's
dev server forwards it server-to-server, where there's no same-origin policy to satisfy. In
production, the equivalent is a reverse proxy (nginx, an edge function, a cloud load balancer
path rule) doing the same forwarding, or an actual BFF service that composes calls to one or more
backends and returns same-origin responses. This is also the standard fix when the "backend" is
someone else's API you don't control: you can't add CORS headers to a server you don't own, but
you can proxy it through one you do.

### CORS, cookies, and CSRF — three different jobs

CORS decides whether your *own* JavaScript can read a cross-origin response. It has nothing to
say about a *different* site making the browser send a request with your session's ambient
cookies — a plain HTML `<form>` POST or `<img src="https://bank.example.com/transfer?...">`
doesn't need to read any response to cause a side effect, so no CORS check ever applies to it.
That's what CSRF tokens and the cookie `SameSite` attribute defend against, and lesson 66 owns
that ground in full. The one place the two topics touch: sending cookies cross-origin at all
requires the cookie to be set with `SameSite=None; Secure` *and* the request to use `credentials:
'include'` *and* the response to carry a specific (non-wildcard) `Access-Control-Allow-Origin`
plus `Access-Control-Allow-Credentials: true` — all four have to line up.

### Private Network Access is becoming Local Network Access

Private Network Access (PNA) — blocking a public website from silently reaching into a user's
private IP ranges (a router at `192.168.1.1`, a local dev server) — is being superseded by
**Local Network Access (LNA)**, which Chrome began enforcing as a user-facing permission prompt
starting with Chrome 142 (September 2025): the first time a public page tries to fetch a private
or loopback address, the browser now asks the user to allow it, similar to a camera or location
prompt, rather than silently allowing or silently blocking. If you run a local dev server that
a deployed site legitimately needs to reach, expect that prompt in current Chrome versions.

## Interview angle

A strong answer here starts from the mechanism, not the vibe: CORS is a browser-enforced,
response-header-controlled relaxation of the same-origin policy, and on this product it matters
because a program shares data across company boundaries, so your Go API is very likely serving
requests from origins you don't fully control — a customer portal, a vendor's tool, maybe an
embedded widget. Say plainly that CORS headers are set by the server, that a request "working in
curl" tells you nothing about whether a browser will let a page read the response, and that the
fix for a caller you don't control is a same-origin proxy, not a header you send from the
frontend. Given the defense-adjacent security posture, allowlist discipline matters more than
usual: reflecting `Origin` back with `Access-Control-Allow-Credentials: true` for every caller is
the single most common way to turn "our API works for every partner" into "any origin on the
internet can read authenticated responses." Compare the incoming origin against a real,
per-program allowlist and only then echo it.

**Likely follow-up:** How would you structure the CORS allowlist when each vendor or partner
company gets its own subdomain, and the list changes as programs are onboarded and offboarded?

**Pitfall:** Saying "just enable CORS" as if it's a boolean. It's an allowlist decision with real
consequences once credentials are involved, and on a program with multiple companies
collaborating, a wildcard-plus-credentials misconfiguration is exactly the kind of finding a
security review would flag first.

### Further reading (optional)

- [MDN: CORS errors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS/Errors)
- [Vite: server.proxy](https://vite.dev/config/server-options.html#server-proxy)
- [MDN: Access-Control-Expose-Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Expose-Headers)
- [Chrome for Developers: Local Network Access](https://developer.chrome.com/blog/local-network-access)
