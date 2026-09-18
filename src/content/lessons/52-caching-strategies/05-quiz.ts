import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'caching-strategies-quiz',
  title: 'Quiz: Caching strategies',
  questions: [
    {
      id: 'no-cache-vs-no-store',
      prompt:
        'A response ships `Cache-Control: no-cache`. A teammate assumes this means the response is never cached and reads it as equivalent to `no-store`. What actually happens on the next request for that URL?',
      choices: [
        { id: 'a', text: 'The response is not stored at all, identical to no-store.' },
        {
          id: 'b',
          text:
            'The response is stored, but a cache must revalidate with the origin (a conditional request) before serving it on every subsequent use -- often resulting in a fast 304 rather than no caching at all.',
        },
        { id: 'c', text: 'The response is stored and served without revalidation for one hour by default.' },
        { id: 'd', text: 'no-cache and no-store are two names for the same directive.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`no-cache` is a naming trap: it means "cache it, but always ask the origin first," not "do not cache." `no-store` is the directive that actually forbids storage. Confusing the two either wastes a caching opportunity (treating no-cache as no-store) or, worse, assumes a no-store response is safely cacheable.',
    },
    {
      id: 'vary-star',
      prompt:
        'A response sets `Vary: *`. What does that do to caching for this response, at every downstream cache (CDN, proxy, browser)?',
      choices: [
        { id: 'a', text: 'Nothing unusual -- it just means "vary by every standard header," which most requests will match on anyway.' },
        {
          id: 'b',
          text:
            'It makes the response effectively uncacheable everywhere downstream: no cache key can be guaranteed to match on a future request, so every cache must treat every request for that URL as a miss.',
        },
        { id: 'c', text: 'It only affects CDN caches; browser caching is unaffected.' },
        { id: 'd', text: 'It forces a 304 on every request instead of skipping the cache.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`Vary: *` is a real, sometimes accidental footgun -- frameworks that build a Vary header from whatever request headers a middleware happened to look at can emit this and silently kill caching for a route, with no error and no obvious symptom besides an unexplained spike in origin traffic.',
    },
    {
      id: 'bfcache-no-store',
      prompt:
        "A page ships `Cache-Control: no-store` on its own HTML response, specifically so the back/forward cache never restores it. As of 2026 Chrome, does that still work?",
      choices: [
        { id: 'a', text: "Yes -- no-store has always disqualified a page from bfcache in every browser, and still does." },
        {
          id: 'b',
          text:
            "No, not by itself -- Chrome's rollout (complete by April 2025) allows no-store pages into bfcache, with a shorter cap (3 minutes) and eviction on cookie change. Only an unload listener, or an open WebSocket/WebTransport/WebRTC connection, reliably blocks it now.",
        },
        { id: 'c', text: 'It works, but only in Firefox and Safari, not Chrome.' },
        { id: 'd', text: 'no-store only affects images and scripts, never the HTML document itself.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is exactly the kind of fact that goes stale in a fast-moving spec area -- advice from before 2025 saying \"set no-store to block bfcache\" is now wrong for Chrome. If you actually need to guarantee a page is never restored from bfcache, an unload listener (accepting its other costs) or checking for sensitive open connections is the reliable route, not no-store.",
    },
    {
      id: 'cdn-cache-key-cookie',
      prompt:
        "A CDN in front of your API caches by URL only, ignoring cookies in the cache key, and the response doesn't set Vary. A route returns different JSON depending on the caller's session cookie (a personalized dashboard). What happens the first time this route gets concurrent requests from two different logged-in users?",
      choices: [
        { id: 'a', text: 'Each user gets their own correct response; cookies are always excluded from caching regardless of Vary.' },
        {
          id: 'b',
          text:
            "Whichever user's response the CDN caches first for that URL can be served to the second user too -- a cross-user data leak, because the cache key has no way to distinguish them and Vary wasn't set to tell it to.",
        },
        { id: 'c', text: 'The CDN automatically detects personalized content and bypasses its cache.' },
        { id: 'd', text: 'The second request always gets a fresh, correct response, just slower.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A cache only knows what you tell it to key on. If a response is personalized by a cookie and the cache doesn\'t key by (or Vary on) that cookie, "cacheable" and "personalized" collide into a data leak. The fix is `private`/`no-store` on personalized responses, not a Vary on the whole cookie (which would destroy the hit rate anyway).',
    },
    {
      id: 'swr-vs-sie',
      prompt:
        'A response has both `stale-while-revalidate=60` and `stale-if-error=600`. A request arrives 30 seconds after the freshness lifetime expired. The origin responds normally (200, not an error). What does the cache do?',
      choices: [
        { id: 'a', text: 'Blocks the request until the full revalidation completes, because stale-if-error takes priority.' },
        {
          id: 'b',
          text:
            "Serves the stale cached response immediately (within the 60s stale-while-revalidate window) while revalidating against the origin -- stale-if-error only matters if that revalidation attempt had come back as a server error.",
        },
        { id: 'c', text: 'Ignores both directives once the response is stale and always re-fetches synchronously.' },
        { id: 'd', text: 'Discards the cached response entirely and returns an error to the caller.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The two directives solve different situations that can both apply to the same stale response: stale-while-revalidate covers the ordinary case (origin is fine, just slow to ask synchronously); stale-if-error only kicks in when a revalidation attempt actually fails with a server error. Here the origin responded fine, so stale-if-error never enters the picture.',
    },
    {
      id: 'hashed-vs-html',
      prompt:
        "A team ships `Cache-Control: public, max-age=31536000, immutable` on index.html itself (not just the hashed JS/CSS it references), reasoning \"longer cache is always better for performance.\" What breaks?",
      choices: [
        { id: 'a', text: 'Nothing -- immutable and a long max-age are always safe to apply everywhere.' },
        {
          id: 'b',
          text:
            "index.html is the one file that has to change on every deploy without its URL changing, since it's what references the new hashed bundle names -- caching it for a year means returning visitors keep loading last year's HTML (and therefore last year's JS/CSS references) until something else forces a reload.",
        },
        { id: 'c', text: 'immutable is only valid on responses larger than 1MB, so this would be silently ignored.' },
        { id: 'd', text: 'This only affects search engine crawlers, not real users.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The hashed-immutable pattern works precisely because the hash makes the URL change when the content does. index.html has no such hash -- it is the thing that has to be re-checked on every visit so a deploy is actually visible. Caching the entry point the same way you cache its immutable children defeats the whole strategy.',
    },
  ],
};
