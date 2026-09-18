import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-the-http-cache-precisely.md?raw';
import promptA from './02-mini-http-cache/prompt.md?raw';
import starterA from './02-mini-http-cache/starter.tsx?raw';
import solutionA from './02-mini-http-cache/solution.tsx?raw';
import hintsA from './02-mini-http-cache/hints.md?raw';
import { checks as checksA } from './02-mini-http-cache/checks';
import concept2 from './03-caching-layers.md?raw';
import promptB from './04-cache-policy-for/prompt.md?raw';
import starterB from './04-cache-policy-for/starter.tsx?raw';
import solutionB from './04-cache-policy-for/solution.tsx?raw';
import hintsB from './04-cache-policy-for/hints.md?raw';
import { checks as checksB } from './04-cache-policy-for/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '52-caching-strategies',
  title: 'Caching strategies',
  track: 'performance',
  summary: 'Cache-Control, ETags, immutable assets, CDNs, service worker caches, and stale-while-revalidate.',
  steps: [
    { kind: 'concept', id: 'the-http-cache-precisely', title: 'The HTTP cache, precisely', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'mini-http-cache',
      title: 'Fix the mini HTTP cache',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'caching-layers', title: 'Layers: CDN, edge, app, service worker', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'cache-policy-for',
      title: 'Pick the right Cache-Control',
      prompt: promptB,
      files: { 'App.tsx': starterB },
      solution: { 'App.tsx': solutionB },
      hints: splitHints(hintsB),
      checks: checksB,
    },
    quiz,
  ],
};

export default lesson;
