import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-where-data-lives.md?raw';
import promptA from './02-persistent-store/prompt.md?raw';
import starterA from './02-persistent-store/starter.tsx?raw';
import solutionA from './02-persistent-store/solution.tsx?raw';
import hintsA from './02-persistent-store/hints.md?raw';
import { checks as checksA } from './02-persistent-store/checks';
import concept2 from './03-observers-and-navigation.md?raw';
import promptB from './04-lazy-load-on-screen/prompt.md?raw';
import starterB from './04-lazy-load-on-screen/starter.tsx?raw';
import solutionB from './04-lazy-load-on-screen/solution.tsx?raw';
import hintsB from './04-lazy-load-on-screen/hints.md?raw';
import { checks as checksB } from './04-lazy-load-on-screen/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '30-web-apis-storage-observers',
  title: 'Web APIs: storage and observers',
  track: 'web-platform',
  summary: 'IndexedDB, OPFS, Cache API, Intersection/Resize/Mutation Observers, and the Navigation API.',
  steps: [
    { kind: 'concept', id: 'where-data-lives', title: 'Where data lives in the browser', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'persistent-store',
      title: 'Build a persistent store',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'observers-and-navigation', title: 'Observers and navigation', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'lazy-load-on-screen',
      title: 'Lazy-load with IntersectionObserver',
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
