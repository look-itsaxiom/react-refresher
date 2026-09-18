import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-tearing-and-the-contract.md?raw';
import promptA from './02-sync-a-store/prompt.md?raw';
import starterA from './02-sync-a-store/starter.tsx?raw';
import solutionA from './02-sync-a-store/solution.tsx?raw';
import hintsA from './02-sync-a-store/hints.md?raw';
import { checks as checksA } from './02-sync-a-store/checks';
import concept2 from './03-useid-and-small-hooks.md?raw';
import promptB from './04-fix-the-field-group/prompt.md?raw';
import starterB from './04-fix-the-field-group/starter.tsx?raw';
import solutionB from './04-fix-the-field-group/solution.tsx?raw';
import hintsB from './04-fix-the-field-group/hints.md?raw';
import { checks as checksB } from './04-fix-the-field-group/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '09-external-stores',
  title: 'useSyncExternalStore and useId',
  track: 'react18',
  summary: 'Subscribing to things outside React without tearing.',
  steps: [
    { kind: 'concept', id: 'tearing-and-the-contract', title: 'Tearing and the external store contract', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'sync-a-store',
      title: 'Sync a store',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'useid-and-small-hooks', title: 'useId and other small hooks', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'fix-the-field-group',
      title: 'Fix the field group',
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
