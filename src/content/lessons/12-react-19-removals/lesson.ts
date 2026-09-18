import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-the-removals-and-why.md?raw';
import promptA from './02-modernize-the-legacy-component/prompt.md?raw';
import starterA from './02-modernize-the-legacy-component/starter.tsx?raw';
import solutionA from './02-modernize-the-legacy-component/solution.tsx?raw';
import hintsA from './02-modernize-the-legacy-component/hints.md?raw';
import { checks as checksA } from './02-modernize-the-legacy-component/checks';
import concept2 from './03-migration-playbook.md?raw';
import promptB from './04-fix-the-broken-context/prompt.md?raw';
import starterB from './04-fix-the-broken-context/starter.tsx?raw';
import solutionB from './04-fix-the-broken-context/solution.tsx?raw';
import hintsB from './04-fix-the-broken-context/hints.md?raw';
import { checks as checksB } from './04-fix-the-broken-context/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '12-react-19-removals',
  title: 'What React 19 removed',
  track: 'react19',
  summary: 'propTypes, string refs, legacy context, ReactDOM.render, and how to migrate.',
  steps: [
    { kind: 'concept', id: 'the-removals-and-why', title: 'The removals and why', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'modernize-the-legacy-component',
      title: 'Modernize the legacy component',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'migration-playbook', title: 'Migration playbook', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'fix-the-broken-context',
      title: 'Fix the broken context',
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
