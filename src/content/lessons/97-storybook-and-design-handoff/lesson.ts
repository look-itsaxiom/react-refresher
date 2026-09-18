import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-stories-as-the-contract.md?raw';
import promptA from './02-docs-generator/prompt.md?raw';
import starterA from './02-docs-generator/starter.tsx?raw';
import solutionA from './02-docs-generator/solution.tsx?raw';
import hintsA from './02-docs-generator/hints.md?raw';
import { checks as checksA } from './02-docs-generator/checks';
import concept2 from './03-closing-the-loop-with-design.md?raw';
import promptB from './04-design-handoff/prompt.md?raw';
import starterB from './04-design-handoff/starter.tsx?raw';
import solutionB from './04-design-handoff/solution.tsx?raw';
import hintsB from './04-design-handoff/hints.md?raw';
import { checks as checksB } from './04-design-handoff/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '97-storybook-and-design-handoff',
  title: 'Storybook and design handoff',
  track: 'design-systems',
  summary: 'Stories as documentation, Figma to code, and visual review workflows.',
  steps: [
    { kind: 'concept', id: 'stories-as-the-contract', title: 'Stories as the contract', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'docs-generator',
      title: 'Build a story-to-docs generator',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'closing-the-loop-with-design', title: 'Closing the loop with design', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'design-handoff',
      title: 'Detect design drift and score handoff readiness',
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
