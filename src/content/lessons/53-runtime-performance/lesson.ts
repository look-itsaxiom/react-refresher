import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-where-inp-goes-to-die.md?raw';
import promptA from './02-feedback-first/prompt.md?raw';
import starterA from './02-feedback-first/starter.tsx?raw';
import solutionA from './02-feedback-first/solution.tsx?raw';
import hintsA from './02-feedback-first/hints.md?raw';
import { checks as checksA } from './02-feedback-first/checks';
import concept2 from './03-big-lists-big-data-and-leaks.md?raw';
import promptB from './04-virtualize-the-list/prompt.md?raw';
import starterB from './04-virtualize-the-list/starter.tsx?raw';
import solutionB from './04-virtualize-the-list/solution.tsx?raw';
import hintsB from './04-virtualize-the-list/hints.md?raw';
import { checks as checksB } from './04-virtualize-the-list/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '53-runtime-performance',
  title: 'Runtime performance',
  track: 'performance',
  summary: 'Long tasks, INP, scheduler.yield, virtualization, workers, and avoiding layout thrash.',
  steps: [
    { kind: 'concept', id: 'where-inp-goes-to-die', title: 'Where INP goes to die', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'feedback-first',
      title: 'Feedback first, then the heavy work',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'big-lists-big-data-and-leaks', title: 'Big lists, big data, and leaks', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'virtualize-the-list',
      title: 'Virtualize the list',
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
