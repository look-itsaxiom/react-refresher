import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-suspense-boundaries.md?raw';
import promptA from './02-add-a-loading-boundary/prompt.md?raw';
import starterA from './02-add-a-loading-boundary/starter.tsx?raw';
import solutionA from './02-add-a-loading-boundary/solution.tsx?raw';
import hintsA from './02-add-a-loading-boundary/hints.md?raw';
import { checks as checksA } from './02-add-a-loading-boundary/checks';
import concept2 from './03-transitions.md?raw';
import promptB from './04-keep-the-tabs-responsive/prompt.md?raw';
import starterB from './04-keep-the-tabs-responsive/starter.tsx?raw';
import solutionB from './04-keep-the-tabs-responsive/solution.tsx?raw';
import hintsB from './04-keep-the-tabs-responsive/hints.md?raw';
import { checks as checksB } from './04-keep-the-tabs-responsive/checks';

const lesson: Lesson = {
  id: '02-suspense-and-transitions',
  title: 'Suspense and transitions',
  track: 'react18',
  summary: 'Loading boundaries, startTransition, useTransition, useDeferredValue.',
  steps: [
    { kind: 'concept', id: 'suspense-boundaries', title: 'Suspense is a boundary', markdown: concept1 },
    { kind: 'exercise', id: 'add-a-loading-boundary', title: 'Add a loading boundary', prompt: promptA, files: { 'App.tsx': starterA }, solution: { 'App.tsx': solutionA }, hints: splitHints(hintsA), checks: checksA },
    { kind: 'concept', id: 'transitions', title: 'Transitions and deferred values', markdown: concept2 },
    { kind: 'exercise', id: 'keep-the-tabs-responsive', title: 'Keep the tabs responsive', prompt: promptB, files: { 'App.tsx': starterB }, solution: { 'App.tsx': solutionB }, hints: splitHints(hintsB), checks: checksB },
  ],
};

export default lesson;
