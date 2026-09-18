import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-the-cascade-grew-up.md?raw';
import promptA from './02-cascade-functions/prompt.md?raw';
import starterA from './02-cascade-functions/starter.tsx?raw';
import solutionA from './02-cascade-functions/solution.tsx?raw';
import hintsA from './02-cascade-functions/hints.md?raw';
import { checks as checksA } from './02-cascade-functions/checks';
import concept2 from './03-layout-motion-color-without-js.md?raw';
import promptB from './04-container-query-card/prompt.md?raw';
import starterB from './04-container-query-card/starter.tsx?raw';
import solutionB from './04-container-query-card/solution.tsx?raw';
import hintsB from './04-container-query-card/hints.md?raw';
import { checks as checksB } from './04-container-query-card/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '28-modern-css',
  title: 'Modern CSS',
  track: 'web-platform',
  summary: 'Cascade layers, container queries, :has(), nesting, subgrid, view transitions, and new color spaces.',
  steps: [
    { kind: 'concept', id: 'the-cascade-grew-up', title: 'The cascade grew up', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'cascade-functions',
      title: 'Model specificity and the layered cascade',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'layout-motion-color-without-js', title: 'Layout, motion, and color without JS', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'container-query-card',
      title: 'Make a card grid responsive with container queries and :has()',
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
