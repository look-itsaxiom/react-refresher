import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'Your app is served from `app.example.com`, and its API is at `api.example.com`. A fetch from the app to the API fails with a CORS error unless the API opts in with `Access-Control-Allow-Origin`. Why does this happen even though both hosts share the same registrable domain and the same session cookie?',
      choices: [
        {
          id: 'a',
          text: 'Cookies scope by registrable domain (so both hosts can share one), but fetch and same-origin policy scope by origin — scheme + host + port — and app.example.com and api.example.com are different origins.',
        },
        { id: 'b', text: 'CORS is unrelated to origin; it blocks any request that crosses a DNS lookup boundary.' },
        { id: 'c', text: 'This should not happen — sharing a domain suffix always means requests are same-origin.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Cookies and CORS use two different notions of "the same site." A cookie without an explicit Domain restriction, or one set with a shared parent domain, can be sent to any subdomain. CORS instead compares the full origin (scheme, host, port) with no wildcard for subdomains, so two different subdomains are always cross-origin to fetch even while a cookie flows between them freely.',
    },
    {
      id: 'q2',
      prompt:
        "A mobile client on a lossy cellular network complains about slow page loads on a site still served over HTTP/2. What's the most likely mechanism, and what would fix it?",
      choices: [
        {
          id: 'a',
          text: "HTTP/2 multiplexes streams over one TCP connection, so a single lost packet forces TCP to stall every stream sharing that connection until it's retransmitted — a transport-layer head-of-line block. Serving over HTTP/3 (QUIC over UDP) removes it, since QUIC's streams are independent at the transport layer too.",
        },
        {
          id: 'b',
          text: 'HTTP/2 opens too many TCP connections per origin, exhausting the phone\'s battery; switching back to HTTP/1.1 with fewer connections would help.',
        },
        { id: 'c', text: 'HTTP/2 does not support compression, so payloads are simply larger on a slow network.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "HTTP/2 solved application-layer head-of-line blocking (multiplexed logical streams instead of one request per connection) but is still carried over TCP, whose strict in-order byte delivery reintroduces blocking at the transport layer whenever a packet is lost. QUIC (HTTP/3's transport) multiplexes at the transport layer too, so a lost packet only stalls the one stream it belonged to — the exact scenario a lossy mobile network produces constantly.",
    },
    {
      id: 'q3',
      prompt:
        'A team migrating off an old asset host wants to lower the risk window during cutover. Which DNS change should they make well before the migration, and why?',
      choices: [
        {
          id: 'a',
          text: "Lower the record's TTL days in advance, so resolvers across the chain are forced to re-check with the authoritative server soon after the actual cutover, instead of serving a stale cached answer for hours.",
        },
        { id: 'b', text: 'Switch from A records to CNAME records, since CNAMEs propagate instantly regardless of TTL.' },
        { id: 'c', text: 'Nothing — DNS changes take effect globally the instant they are published, regardless of prior TTL.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "A record's TTL controls how long every resolver in the chain — the OS, the ISP's recursive resolver, any intermediate cache — is allowed to keep serving the old answer without asking again. Lowering it ahead of time means, by the time the actual IP changes, resolvers are already re-checking frequently, shrinking the window where some fraction of users still gets routed to the old host. Changing the record type doesn't affect propagation speed; TTL does.",
    },
    {
      id: 'q4',
      prompt:
        'A form submits a payment with `POST /charge`. The client times out waiting for a response and, not knowing whether the charge succeeded, retries the exact same POST automatically. What went wrong with the retry policy?',
      choices: [
        {
          id: 'a',
          text: "POST is neither safe nor idempotent, so blindly retrying it can double-charge the customer; a client-side retry policy should only auto-retry safe/idempotent requests (GETs, or POSTs with a server-recognized idempotency key), not arbitrary POSTs.",
        },
        { id: 'b', text: 'Nothing is wrong — HTTP guarantees a POST is only ever applied once, no matter how many times it is sent.' },
        { id: 'c', text: 'The fix is to switch the endpoint to GET so it becomes safe to retry.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "GET is safe (no side effects) and PUT/DELETE are idempotent (repeating them produces the same end state), which is why generic retry logic can treat them as retry-safe. POST is neither by default — HTTP gives no such guarantee — so a timeout genuinely leaves the client unable to tell success from failure, and retrying unconditionally risks a duplicate charge. The real fix is either not auto-retrying the POST, or having the server accept a client-generated idempotency key so a retried request with the same key is recognized as a duplicate.",
    },
    {
      id: 'q5',
      prompt:
        'A static marketing site (pre-built HTML/CSS/JS, no server-side logic) is deployed to a "static host." A visitor in Tokyo and a visitor in São Paulo both report fast load times despite the origin bucket being in one AWS region. What explains this, and what would change if the same team added a server-rendered, per-user dashboard to the same domain?',
      choices: [
        {
          id: 'a',
          text: "A CDN in front of the static host serves cached copies from an edge PoP near each visitor, so most requests never reach the origin region at all; a per-user dashboard can't be served this way from a plain cache; it needs either an origin server or edge compute (edge functions) to run per-request logic close to the user instead.",
        },
        { id: 'b', text: 'Static hosts replicate the origin bucket\'s contents to every AWS region automatically, so there is effectively no "origin" location at all.' },
        { id: 'c', text: 'The fast load times are unrelated to hosting; they are purely a result of small file sizes.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "A static host is, functionally, a CDN pointed at pre-built files: PoPs near each visitor serve from cache, so distance to the single origin region rarely matters for a cache hit. That model has no compute step at all, which is exactly why it can't run per-user logic. Adding a dynamic, personalized dashboard requires either falling back to an origin server per request or running edge functions that execute close to the user without a round trip to a distant origin.",
    },
    {
      id: 'q6',
      prompt:
        'Your app currently splits static assets across `img1.example.com`, `img2.example.com`, and `img3.example.com`, a pattern inherited from an HTTP/1.1-era codebase. The site has since moved entirely to HTTP/2 and HTTP/3. Should this sharding stay?',
      choices: [
        {
          id: 'a',
          text: 'No — sharding was a workaround for the browser\'s per-origin connection cap under HTTP/1.1; HTTP/2 and HTTP/3 multiplex unlimited concurrent requests over one connection, so sharding now only adds redundant DNS lookups and handshakes and defeats connection coalescing.',
        },
        { id: 'b', text: 'Yes — more hostnames always means more parallelism, regardless of HTTP version.' },
        { id: 'c', text: 'It makes no difference either way; hostname count has never affected load performance.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Domain sharding existed to dodge the ~6-connections-per-origin limit browsers enforced for HTTP/1.1. HTTP/2's multiplexing and HTTP/3's QUIC streams both remove that ceiling on a single connection, so splitting assets across hostnames now just costs extra DNS lookups and TLS handshakes, and prevents connection coalescing (reusing one connection for multiple hostnames that resolve to the same server). Modern guidance is to consolidate assets onto as few origins as practical.",
    },
  ],
};
