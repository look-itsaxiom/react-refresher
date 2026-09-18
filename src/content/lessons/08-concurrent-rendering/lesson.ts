import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-fiber-lanes-and-priorities.md?raw';
import promptA from './02-pure-render-required/prompt.md?raw';
import starterA from './02-pure-render-required/starter.tsx?raw';
import solutionA from './02-pure-render-required/solution.tsx?raw';
import hintsA from './02-pure-render-required/hints.md?raw';
import { checks as checksA } from './02-pure-render-required/checks';
import concept2 from './03-strict-mode-and-actions.md?raw';
import promptB from './04-responsive-filter/prompt.md?raw';
import starterB from './04-responsive-filter/starter.tsx?raw';
import solutionB from './04-responsive-filter/solution.tsx?raw';
import hintsB from './04-responsive-filter/hints.md?raw';
import { checks as checksB } from './04-responsive-filter/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '08-concurrent-rendering',
  title: 'Concurrent rendering mental model',
  track: 'react18',
  summary: 'Interruptible rendering, priorities, and what StrictMode double-invokes.',
  steps: [
    { kind: 'concept', id: 'fiber-lanes-and-priorities', title: 'Rendering can be interrupted', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'pure-render-required',
      title: 'Fix the impure render',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'strict-mode-and-actions', title: 'StrictMode and async transitions', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'responsive-filter',
      title: 'Keep the search box responsive',
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
