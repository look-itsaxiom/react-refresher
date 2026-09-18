import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-ship-less-ship-later-ship-in-order.md?raw';
import promptA from './02-lazy-chart/prompt.md?raw';
import starterA from './02-lazy-chart/starter.tsx?raw';
import chartA from './02-lazy-chart/Chart.tsx?raw';
import solutionA from './02-lazy-chart/solution.tsx?raw';
import hintsA from './02-lazy-chart/hints.md?raw';
import { checks as checksA } from './02-lazy-chart/checks';
import concept2 from './03-fonts-prefetching-and-budgets.md?raw';
import promptB from './04-resource-hints-and-fonts/prompt.md?raw';
import starterB from './04-resource-hints-and-fonts/starter.tsx?raw';
import solutionB from './04-resource-hints-and-fonts/solution.tsx?raw';
import hintsB from './04-resource-hints-and-fonts/hints.md?raw';
import { checks as checksB } from './04-resource-hints-and-fonts/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '50-loading-performance',
  title: 'Loading performance',
  track: 'performance',
  summary: 'Code splitting, lazy loading, preload/prefetch, priority hints, and fonts.',
  steps: [
    {
      kind: 'concept',
      id: 'ship-less-ship-later-ship-in-order',
      title: 'Ship less, ship later, ship in order',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'lazy-chart',
      title: 'Split, warm, and transition into a heavy tab',
      prompt: promptA,
      files: { 'App.tsx': starterA, 'Chart.tsx': chartA },
      solution: { 'App.tsx': solutionA, 'Chart.tsx': chartA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'fonts-prefetching-and-budgets',
      title: 'Fonts, prefetching, and budgets',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'resource-hints-and-fonts',
      title: 'Plan resource hints and a font loading strategy',
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
