import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A product page\'s hero image is the Largest Contentful Paint element. It currently ships with `loading="lazy"` and no `fetchpriority`. What is the single most direct fix?',
      choices: [
        { id: 'a', text: 'Add `decoding="sync"` so the browser blocks rendering until the image is fully decoded.' },
        {
          id: 'b',
          text: 'Remove `loading="lazy"` (or set `loading="eager"`) and add `fetchpriority="high"`, so the browser discovers and fetches the image immediately at high priority.',
        },
        { id: 'c', text: 'Convert the image to an animated WebP so it appears to load faster.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`loading="lazy"` defers fetching until the browser knows the element is near-viewport, which delays the very metric being optimized. `fetchpriority="high"` then tells the browser to fetch it ahead of lower-priority resources. `decoding` controls pixel decode blocking, not fetch timing, and format has nothing to do with fetch scheduling.',
    },
    {
      id: 'q2',
      prompt:
        'A card grid image is generated at widths 400, 800, and 1200, and rendered inside a column that is roughly a third of the viewport width on desktop, full width on mobile. Which `sizes` value is correct?',
      choices: [
        { id: 'a', text: '`sizes="400px"` — always request the smallest generated width.' },
        { id: 'b', text: '`sizes="(min-width: 768px) 33vw, 100vw"` — describes the actual rendered width at each breakpoint.' },
        { id: 'c', text: '`sizes` is unnecessary as long as `srcset` is present; the browser infers layout size from `width`/`height`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`sizes` tells the browser the rendered width so it can pick the right `srcset` candidate before layout is fully resolved — it has to match the actual CSS behavior. Omitting it makes the browser assume 100vw, which picks an oversized candidate on desktop where the card is much narrower than the viewport.',
    },
    {
      id: 'q3',
      prompt: 'What is the practical difference between `srcset` with width descriptors and `<picture>` with multiple `<source media="...">` elements?',
      choices: [
        {
          id: 'a',
          text: '`srcset` serves the same image at different resolutions for the browser to pick from; `<picture>` with `media` conditions can serve a genuinely different image (a different crop or composition) per breakpoint — art direction, not just resolution switching.',
        },
        { id: 'b', text: 'They are interchangeable syntaxes for the same feature; `<picture>` is just newer.' },
        { id: 'c', text: '`srcset` only works with JPEG; `<picture>` is required for AVIF and WebP.' },
      ],
      correctChoiceId: 'a',
      explanation:
        '`srcset` resolution-switches between variants of the same image. `<picture>` with `<source media>` can swap in an entirely different source image per condition (art direction) — the two solve different problems and are often combined, since `<picture>` sources can themselves carry a `srcset`.',
    },
    {
      id: 'q4',
      prompt:
        'A team wants to switch every animated GIF on a marketing site to something smaller with identical visual behavior (autoplay, loop, no sound, no controls). What is the standard replacement, and why does it save bytes?',
      choices: [
        {
          id: 'a',
          text: 'A `<video muted autoplay loop playsinline>` re-encoding the same clip — video codecs compress far better than GIF\'s per-frame palette-based scheme, often 10x smaller for the same result.',
        },
        { id: 'b', text: 'An AVIF image sequence, because AVIF is an image format and therefore always smaller than video.' },
        { id: 'c', text: 'There is no smaller equivalent; GIF is the only format that autoplays without user interaction.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'GIF\'s compression is old and inefficient (limited palette, no inter-frame prediction beyond simple deltas). A muted, autoplaying, looping `<video>` reproduces the same UX at a fraction of the size because video codecs use motion compensation and modern entropy coding. `playsinline` is what stops iOS Safari from forcing fullscreen.',
    },
    {
      id: 'q5',
      prompt:
        'A long changelog page has 80 sections, most of which the average visitor never scrolls to. Lighthouse shows a large "Rendering" cost even though most content is off-screen. What CSS property addresses this directly?',
      choices: [
        { id: 'a', text: '`will-change: transform` on every section, to hint the browser to pre-composite them.' },
        {
          id: 'b',
          text: '`content-visibility: auto` on each section (with `contain-intrinsic-size` to reserve scroll space), so the browser skips layout and paint work for off-screen sections until they near the viewport.',
        },
        { id: 'c', text: '`display: none` on sections below the fold, toggled on with an IntersectionObserver.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`content-visibility: auto` is designed exactly for this: it skips rendering work for off-screen content automatically, without manual show/hide logic. `contain-intrinsic-size` avoids a layout jump by giving the browser a placeholder size before a section is ever measured. Manually toggling `display: none` reinvents this with JS and loses the placeholder sizing unless you add it yourself.',
    },
    {
      id: 'q6',
      prompt:
        'A YouTube embed on a landing page is measured to pull in several hundred KB of player chrome and scripts on every page load, even though most visitors never press play. What is the standard fix?',
      choices: [
        { id: 'a', text: 'Add `loading="lazy"` to the `<iframe>` and stop there — that fully solves the cost.' },
        {
          id: 'b',
          text: 'Replace the live embed with a static facade (a poster image styled like the player) that only creates the real `<iframe>` on click, deferring the player\'s scripts and chrome until the user shows intent to watch.',
        },
        { id: 'c', text: 'Self-host the video file directly with `<video>` and no player UI, to avoid third-party scripts entirely.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`loading="lazy"` only defers the iframe fetch until it nears the viewport — on a landing page the embed is often already in view, so it fetches immediately anyway, and either way it does nothing about the embedded page\'s own scripts once it loads. A facade defers the entire cost (player chrome, tracking scripts) until an actual click. Self-hosting throws away YouTube\'s CDN and adaptive streaming for no real gain here.',
    },
  ],
};
