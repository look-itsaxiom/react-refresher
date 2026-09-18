import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-mock-the-network.md?raw';
import promptA from './02-mini-msw/prompt.md?raw';
import starterA from './02-mini-msw/starter.tsx?raw';
import solutionA from './02-mini-msw/solution.tsx?raw';
import hintsA from './02-mini-msw/hints.md?raw';
import { checks as checksA } from './02-mini-msw/checks';
import concept2 from './03-stories-as-tests.md?raw';
import promptB from './04-mini-csf3/prompt.md?raw';
import starterB from './04-mini-csf3/starter.tsx?raw';
import solutionB from './04-mini-csf3/solution.tsx?raw';
import hintsB from './04-mini-csf3/hints.md?raw';
import { checks as checksB } from './04-mini-csf3/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '43-api-mocking-and-storybook',
  title: 'MSW, Storybook, and visual testing',
  track: 'testing',
  summary: 'Mock the network once, document components, and catch visual regressions.',
  steps: [
    { kind: 'concept', id: 'mock-the-network', title: 'Mock the network, not the module', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'mini-msw',
      title: 'Build a request handler and matcher',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'stories-as-tests', title: 'Stories as tests and documentation', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'mini-csf3',
      title: 'Compose stories into portable, testable components',
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
