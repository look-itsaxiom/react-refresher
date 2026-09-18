import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-what-landed.md?raw';
import promptA from './02-modernize-data-pipeline/prompt.md?raw';
import starterA from './02-modernize-data-pipeline/starter.tsx?raw';
import solutionA from './02-modernize-data-pipeline/solution.tsx?raw';
import hintsA from './02-modernize-data-pipeline/hints.md?raw';
import { checks as checksA } from './02-modernize-data-pipeline/checks';
import concept2 from './03-coming-and-dead.md?raw';
import promptB from './04-lazy-pipelines/prompt.md?raw';
import starterB from './04-lazy-pipelines/starter.tsx?raw';
import solutionB from './04-lazy-pipelines/solution.tsx?raw';
import hintsB from './04-lazy-pipelines/hints.md?raw';
import { checks as checksB } from './04-lazy-pipelines/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '31-modern-javascript',
  title: 'JavaScript since ES2020',
  track: 'javascript-typescript',
  summary: 'Iterator helpers, Set methods, Temporal, using declarations, Array grouping, and Promise.withResolvers.',
  steps: [
    { kind: 'concept', id: 'what-landed', title: 'What landed in the language, ES2021 to ES2025', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'modernize-data-pipeline',
      title: 'Modernize a data pipeline',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'coming-and-dead', title: "What's coming, and what died", markdown: concept2 },
    {
      kind: 'exercise',
      id: 'lazy-pipelines',
      title: 'Lazy iterator pipelines',
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
