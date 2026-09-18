import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-measuring-react-the-right-way.md?raw';
import promptA from './02-stop-the-cascade/prompt.md?raw';
import starterA from './02-stop-the-cascade/starter.tsx?raw';
import solutionA from './02-stop-the-cascade/solution.tsx?raw';
import hintsA from './02-stop-the-cascade/hints.md?raw';
import { checks as checksA } from './02-stop-the-cascade/checks';
import concept2 from './03-fixes-in-order-of-leverage.md?raw';
import promptB from './04-pre-render-the-next-screen/prompt.md?raw';
import starterB from './04-pre-render-the-next-screen/starter.tsx?raw';
import solutionB from './04-pre-render-the-next-screen/solution.tsx?raw';
import hintsB from './04-pre-render-the-next-screen/hints.md?raw';
import { checks as checksB } from './04-pre-render-the-next-screen/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '54-react-performance',
  title: 'React performance',
  track: 'performance',
  summary: 'Profiler, the Compiler, memo boundaries, transitions, Activity, and bundle analysis.',
  steps: [
    { kind: 'concept', id: 'measuring-react-the-right-way', title: 'Measuring React the right way', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'stop-the-cascade',
      title: 'Stop the cascade',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'fixes-in-order-of-leverage', title: 'The fixes, in order of leverage', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'pre-render-the-next-screen',
      title: 'Pre-render the next screen',
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
