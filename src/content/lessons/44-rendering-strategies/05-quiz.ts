import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A pricing page is identical for every visitor and only changes when the team edits it in a CMS, maybe twice a month, with no requirement that the change appear instantly. Which strategy fits best, and why not plain SSG?',
      choices: [
        { id: 'a', text: 'SSR — pricing pages are important enough to always render fresh.' },
        {
          id: 'b',
          text: "ISR with a long revalidate window (or on-demand invalidation triggered by the CMS webhook). Plain SSG would technically work too, but it means every content edit requires a full rebuild and redeploy; ISR gets the same near-zero per-request cost while letting the CMS trigger a refresh without a deploy.",
        },
        { id: 'c', text: 'CSR — fetch the pricing data client-side so it is always current.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The content is not per-visitor, so SSR's per-request cost buys nothing here. The only reason to prefer ISR over pure SSG is decoupling content updates from deploys — exactly this page's situation, since a CMS edit shouldn't require a rebuild.",
    },
    {
      id: 'q2',
      prompt:
        'A route renders a page whose header/nav/footer are identical for everyone, but one section shows "Recommended for you," which requires the visitor\'s session. What does Partial Prerendering (Next.js\'s Cache Components model) let you do that plain ISR on the whole route cannot?',
      choices: [
        {
          id: 'a',
          text: 'Cache the static shell indefinitely and serve it instantly, while the personalized hole renders per request and streams in — all within one response, instead of choosing one caching policy for the entire route.',
        },
        { id: 'b', text: 'Nothing different — ISR with a short revalidate window achieves the same result.' },
        { id: 'c', text: 'It moves the entire page to the client, avoiding server rendering altogether.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "ISR revalidates the whole cached entry on one timer — it can't serve part of a route from cache and render another part per request in the same response. That's specifically what a static-shell-plus-dynamic-holes model buys: the header/nav/footer never re-render while the personalized strip does, without lowering the revalidate window for content that doesn't need it.",
    },
    {
      id: 'q3',
      prompt:
        'A dashboard page needs three independent, slow data sources to render three widgets (say 200ms, 800ms, and 2s). With streaming SSR and a `<Suspense>` boundary around each widget, what is the actual benefit over rendering the whole page with plain (non-streaming) SSR?',
      choices: [
        {
          id: 'a',
          text: 'The total server time drops, because streaming makes the three fetches faster.',
        },
        {
          id: 'b',
          text: "The shell and the 200ms widget can reach the browser and paint almost immediately, instead of the whole response waiting on the slowest (2s) widget; the two slower widgets stream in as their own chunks whenever each resolves, each unblocking independently.",
        },
        { id: 'c', text: 'It eliminates the need for the widgets to fetch data on the server at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Streaming doesn't make the underlying fetches faster — it changes when the response can start sending bytes. Plain SSR is gated on the slowest subtree; wrapping each slow part in Suspense lets the fast parts ship first and the slow ones arrive out of order as separate chunks, each replacing its own fallback.",
    },
    {
      id: 'q4',
      prompt:
        "An SSR page's response varies based on both a `?sort=` query parameter and an `Accept-Language` header, but the CDN in front of it caches by pathname only. What actually happens, and what's the fix?",
      choices: [
        {
          id: 'a',
          text: 'Nothing breaks — the CDN forwards every request to the origin regardless of cache key, so freshness is unaffected either way.',
        },
        {
          id: 'b',
          text: "Whichever combination of sort order and language rendered first for that path gets cached and served to every subsequent visitor to that path, regardless of their own query string or language — a cache-key bug, not a rendering bug. The fix is including both dimensions in the cache key (full URL, plus a Vary on Accept-Language or the framework's equivalent).",
        },
        { id: 'c', text: 'The CDN automatically detects the missing dimensions and falls back to SSR on every request.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A cache serves whatever it stored under the key it was given. If the key ignores a dimension the response actually varies on, one visitor's response leaks to every other visitor who shares that (too-coarse) key — a correctness bug that looks like a caching win until someone notices they're seeing someone else's sort order or language.",
    },
    {
      id: 'q5',
      prompt:
        'A blog built with Astro renders every post as static HTML at build time, except a single "recent comments" widget marked as a server island. What is actually happening at request time for a visitor loading that post?',
      choices: [
        {
          id: 'a',
          text: 'The entire post re-renders on the server for every request, because any server island forces the whole page to become dynamic.',
        },
        {
          id: 'b',
          text: "The already-built static HTML for the post is served as-is (from a CDN, no origin compute), with a placeholder for the comments widget; the server island's markup is fetched and rendered separately, per request, and slotted into that placeholder.",
        },
        { id: 'c', text: 'The comments widget is rendered entirely client-side, identical to Astro shipping it as an interactive island.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is the point of server islands: one component's data can be genuinely per-request without downgrading the rest of an otherwise-static page. It's a finer-grained version of the same idea as Partial Prerendering — a mostly-static document with one small, separately-rendered dynamic piece — applied to Astro's islands model instead of a single monolithic SSR response.",
    },
    {
      id: 'q6',
      prompt:
        "A logged-in-only analytics dashboard shows numbers that must reflect the current session's data and can never be shared between users. A teammate suggests SSR with a CDN cache in front of it to \"make it faster like the marketing pages.\" What's wrong with that suggestion?",
      choices: [
        {
          id: 'a',
          text: "Nothing — CDN caching in front of SSR always improves TTFB regardless of what the response contains.",
        },
        {
          id: 'b',
          text: "A cache in front of a per-user, non-shareable response either serves one user's private data to another (a security bug, if the cache key doesn't include enough of the session) or never gets a cache hit at all (if it correctly keys on something unique per user) — so it adds complexity for a caching layer that structurally cannot pay off. SSR with `no-store`, or CSR against an authenticated API, are the honest options; caching isn't one of them for this content.",
        },
        { id: 'c', text: "It's fine as long as the revalidate window is set short enough, like 5 seconds." },
      ],
      correctChoiceId: 'b',
      explanation:
        'This is the dashboard row from the decision table: per-user, non-cacheable-at-a-shared-layer content. A short revalidate window doesn\'t fix a correctness problem — it just narrows the window during which stale or (worse) another user\'s cached response could be served. The freshness/caching axis and the "is this shareable across visitors" axis are different questions, and the second one gates whether caching is even a valid option at all.',
    },
  ],
};
