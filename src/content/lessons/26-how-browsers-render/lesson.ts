import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-the-critical-rendering-path.md?raw';
import promptA from './02-stop-the-layout-thrash/prompt.md?raw';
import starterA from './02-stop-the-layout-thrash/starter.tsx?raw';
import solutionA from './02-stop-the-layout-thrash/solution.tsx?raw';
import hintsA from './02-stop-the-layout-thrash/hints.md?raw';
import { checks as checksA } from './02-stop-the-layout-thrash/checks';
import concept2 from './03-the-event-loop-precisely.md?raw';
import promptB from './04-predict-then-fix-the-ordering/prompt.md?raw';
import starterB from './04-predict-then-fix-the-ordering/starter.tsx?raw';
import solutionB from './04-predict-then-fix-the-ordering/solution.tsx?raw';
import hintsB from './04-predict-then-fix-the-ordering/hints.md?raw';
import { checks as checksB } from './04-predict-then-fix-the-ordering/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '26-how-browsers-render',
  title: 'How browsers render',
  track: 'web-platform',
  summary: 'Parsing, the render tree, layout, paint, compositing, and the event loop.',
  steps: [
    { kind: 'concept', id: 'the-critical-rendering-path', title: 'The critical rendering path', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'stop-the-layout-thrash',
      title: 'Stop the layout thrash',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'the-event-loop-precisely', title: 'The event loop, precisely', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'predict-then-fix-the-ordering',
      title: 'Predict, then fix, the ordering',
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
