import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-the-spectrum-precisely.md?raw';
import promptA from './02-ssr-hydrate/prompt.md?raw';
import starterA from './02-ssr-hydrate/starter.tsx?raw';
import solutionA from './02-ssr-hydrate/solution.tsx?raw';
import hintsA from './02-ssr-hydrate/hints.md?raw';
import { checks as checksA } from './02-ssr-hydrate/checks';
import concept2 from './03-choosing-per-route.md?raw';
import promptB from './04-isr-cache/prompt.md?raw';
import starterB from './04-isr-cache/starter.tsx?raw';
import solutionB from './04-isr-cache/solution.tsx?raw';
import hintsB from './04-isr-cache/hints.md?raw';
import { checks as checksB } from './04-isr-cache/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '44-rendering-strategies',
  title: 'CSR, SSR, SSG, ISR, streaming',
  track: 'rendering',
  summary: 'The rendering spectrum, tradeoffs, and how to pick per route.',
  steps: [
    { kind: 'concept', id: 'the-spectrum-precisely', title: 'The spectrum, precisely', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'ssr-hydrate',
      title: 'Build a real SSR + hydrate pipeline',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'choosing-per-route', title: 'Choosing per route, not per app', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'isr-cache',
      title: 'Build an ISR cache: stale-while-revalidate',
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
