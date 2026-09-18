import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-the-lifecycle-nobody-remembers.md?raw';
import promptA from './02-implement-caching-strategies/prompt.md?raw';
import starterA from './02-implement-caching-strategies/starter.tsx?raw';
import solutionA from './02-implement-caching-strategies/solution.tsx?raw';
import hintsA from './02-implement-caching-strategies/hints.md?raw';
import { checks as checksA } from './02-implement-caching-strategies/checks';
import concept2 from './03-caching-strategies-and-offline.md?raw';
import promptB from './04-lifecycle-and-precache-diff/prompt.md?raw';
import starterB from './04-lifecycle-and-precache-diff/starter.tsx?raw';
import solutionB from './04-lifecycle-and-precache-diff/solution.tsx?raw';
import hintsB from './04-lifecycle-and-precache-diff/hints.md?raw';
import { checks as checksB } from './04-lifecycle-and-precache-diff/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '85-service-workers-and-offline',
  title: 'Service workers and offline',
  track: 'pwa',
  summary: 'Lifecycle, caching strategies, Workbox, background sync, and update flows.',
  steps: [
    { kind: 'concept', id: 'the-lifecycle-nobody-remembers', title: 'The lifecycle nobody remembers', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'implement-caching-strategies',
      title: 'Implement the caching strategies',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'caching-strategies-and-offline', title: 'Caching strategies and offline', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'lifecycle-and-precache-diff',
      title: 'Model the lifecycle and the precache diff',
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
