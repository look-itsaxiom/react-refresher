import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-framing-the-problem.md?raw';
import promptA from './02-relationship-permissions/prompt.md?raw';
import starterA from './02-relationship-permissions/starter.tsx?raw';
import solutionA from './02-relationship-permissions/solution.tsx?raw';
import hintsA from './02-relationship-permissions/hints.md?raw';
import { checks as checksA } from './02-relationship-permissions/checks';
import concept2 from './03-realtime-conflicts-and-history.md?raw';
import promptB from './04-realtime-and-conflicts/prompt.md?raw';
import starterB from './04-realtime-and-conflicts/starter.tsx?raw';
import solutionB from './04-realtime-and-conflicts/solution.tsx?raw';
import hintsB from './04-realtime-and-conflicts/hints.md?raw';
import { checks as checksB } from './04-realtime-and-conflicts/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '112-system-design-cross-org-collaboration',
  track: 'interview',
  title: 'System design: cross-organization collaboration',
  summary: 'Permissions across companies, real-time updates, conflict handling, audit history, and the data model for shared programs.',
  steps: [
    { kind: 'concept', id: 'framing-the-problem', title: 'Frame the problem like an interviewer wants', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'relationship-permissions',
      title: 'Build a Zanzibar-style relationship evaluator',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'realtime-conflicts-and-history', title: 'Real time, conflicts, and history', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'realtime-and-conflicts',
      title: 'Model the real-time and conflict layer',
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
