import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-three-ways-to-ship.md?raw';
import promptA from './02-file-system-routing/prompt.md?raw';
import starterA from './02-file-system-routing/starter.tsx?raw';
import solutionA from './02-file-system-routing/solution.tsx?raw';
import hintsA from './02-file-system-routing/hints.md?raw';
import { checks as checksA } from './02-file-system-routing/checks';
import concept2 from './03-where-they-differ.md?raw';
import promptB from './04-loader-action-data-flow/prompt.md?raw';
import starterB from './04-loader-action-data-flow/starter.tsx?raw';
import solutionB from './04-loader-action-data-flow/solution.tsx?raw';
import hintsB from './04-loader-action-data-flow/hints.md?raw';
import { checks as checksB } from './04-loader-action-data-flow/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '23-frameworks',
  title: 'Next.js, React Router framework mode, TanStack Start',
  track: 'server',
  summary: 'How the frameworks package RSC and where they differ.',
  steps: [
    { kind: 'concept', id: 'three-ways-to-ship', title: 'Three ways to ship React on the server', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'file-system-routing',
      title: 'Model file-system routing',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'where-they-differ', title: 'Where they differ in practice', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'loader-action-data-flow',
      title: 'Fix a loader/action data-flow model',
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
