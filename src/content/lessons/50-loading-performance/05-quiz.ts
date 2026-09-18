import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'loading-performance-quiz',
  title: 'Quiz: loading and priority',
  questions: [
    {
      id: 'lazy-vs-preload',
      prompt:
        "A settings modal is `React.lazy`-loaded and opens instantly the first time a user tries it, with no visible fallback. Someone on the team says this means the `Suspense` fallback is dead code and should be removed. What's the right response?",
      choices: [
        { id: 'a', text: "Remove it — if it never shows, `Suspense` isn't doing anything." },
        {
          id: 'b',
          text: 'Keep it. The chunk is probably being warmed (hover/viewport preload) before the click, but a cold load — a bookmark, a slow network, disabled JS preloading — still needs a fallback.',
        },
        { id: 'c', text: 'Replace `Suspense` with a plain loading boolean, since the fallback is unreachable.' },
        { id: 'd', text: 'Remove `React.lazy` entirely and ship the modal in the main bundle instead.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A fast fallback-free open in testing usually means preloading is working, not that the fallback path is unreachable. Suspense still protects the case where the chunk genuinely isn\'t cached yet — direct navigation, a cold cache, or preloading that silently failed.',
    },
    {
      id: 'preload-misuse',
      prompt:
        'A page has `<link rel="preload">` tags for the hero image, the body font, a below-the-fold product image, and three analytics scripts. Chrome DevTools shows preload warnings on several of them. What\'s the most likely problem?',
      choices: [
        { id: 'a', text: 'Preload only works for images, so the font and script preloads are invalid.' },
        {
          id: 'b',
          text: "Too many things are marked 'preload' — a below-the-fold image and analytics scripts aren't on the critical path, so they compete with the hero image and font for the same high-priority bandwidth instead of loading later.",
        },
        { id: 'c', text: 'Preload tags must appear in `<body>`, not `<head>`, to be recognized.' },
        { id: 'd', text: 'Preload requires `fetchpriority="high"` on every tag or it is ignored.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Preload is a promise to the browser: this will be used immediately, prioritize it. Marking everything preload defeats the point — it just recreates the priority problem for the resources that actually matter (the hero image, the critical font), and the unused ones trigger \"preloaded but not used\" warnings.",
    },
    {
      id: 'waterfall',
      prompt:
        'A lazy-loaded route renders a skeleton, then fetches its data inside `useEffect` after mount, then that data-fetching code dynamically imports a formatting library it needs. Network tab shows three sequential round trips. What fixes the waterfall with the least restructuring?',
      choices: [
        {
          id: 'a',
          text: 'Nothing to fix — three round trips is normal for a lazy route and cannot be avoided.',
        },
        { id: 'b', text: 'Remove `React.lazy` so the route is no longer split.' },
        {
          id: 'c',
          text: 'Start the data fetch (and the formatting library import) in parallel with the route chunk import, e.g. from the click handler, instead of waiting for the chunk to render before either kicks off.',
        },
        { id: 'd', text: 'Add `rel="prefetch"` for the data endpoint URL.' },
      ],
      correctChoiceId: 'c',
      explanation:
        "The waterfall exists because each step only starts once the previous one has rendered. Kicking off the code fetch, the data fetch, and any dependency the data layer needs at the same moment — rather than discovering each one after the last resolves — turns three serial round trips into (at most) one.",
    },
    {
      id: 'font-display-choice',
      prompt:
        'A UI ships a decorative icon font used for a handful of small toolbar glyphs, and a separate variable font for all body text. Which `font-display` pairing fits best?',
      choices: [
        { id: 'a', text: 'Both `block`, so nothing ever shows an unstyled glyph.' },
        { id: 'b', text: 'Body text `optional`, icon font `swap`.' },
        {
          id: 'c',
          text: 'Body text `swap` (readable text now, swap in later), icon font `optional` (fine to skip the swap if it is not ready fast).',
        },
        { id: 'd', text: 'Both `swap`, since `optional` is deprecated.' },
      ],
      correctChoiceId: 'c',
      explanation:
        'Body text is high-value and should never stay invisible or missing, so `swap` (readable now, upgrade later) is right. A toolbar icon font is low-value and prone to causing a jarring re-layout on a late swap; `optional` lets the browser skip the swap if the font is not ready almost immediately.',
    },
    {
      id: 'speculation-rules-scope',
      prompt:
        'A marketing site adds a `prerender` speculation rule matching every internal link with `eagerness: "eager"`, hoping every navigation feels instant. What is the most likely downside?',
      choices: [
        {
          id: 'a',
          text: 'Nothing — prerendering has no cost since the hidden tab is invisible to the user.',
        },
        {
          id: 'b',
          text: 'Every hovered/likely link now fully renders in a hidden tab (JS execution, subresources, and side effects like analytics), for links the user may never click — real cost for a low hit rate, and only in Chromium browsers.',
        },
        { id: 'c', text: 'Speculation rules only work for the first link on a page.' },
        { id: 'd', text: 'Prerendering disables `React.lazy` on the prerendered page.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Prerender is the most expensive speculative action — a full render including JS execution, not just a byte fetch — so scoping it broadly multiplies that cost by every plausible link, most of which won't be clicked. It's also Chromium-only, so the win doesn't apply everywhere. Scoping to a few high-confidence targets (or a lighter `prefetch` rule for the rest) is the usual fix.",
    },
    {
      id: 'budget-in-ci',
      prompt:
        'A PR adds a date-formatting library to a component that renders on every page. The bundle grows by 40KB gzipped but all tests pass and Lighthouse still scores well on the reviewer\'s fast machine. What catches this before it ships?',
      choices: [
        { id: 'a', text: 'Nothing needs to catch it — a passing test suite means the change is safe.' },
        {
          id: 'b',
          text: 'A bundle size budget (size-limit or similar) on the affected entry point/chunk, checked in CI on every PR, independent of whether Lighthouse happens to still look fine on that run.',
        },
        { id: 'c', text: 'Asking the reviewer to manually check DevTools on their own connection speed.' },
        { id: 'd', text: 'Switching the app to server-side rendering, which eliminates bundle size as a concern.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Lighthouse scores are noisy and machine-dependent; a byte budget on a specific entry point is a hard, deterministic check that fails the build the moment a dependency changes weight, which is exactly the failure mode here — no human judgment call required on every PR.",
    },
  ],
};
