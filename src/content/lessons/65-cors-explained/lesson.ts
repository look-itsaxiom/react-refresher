import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-cors-is-relaxation.md?raw';
import promptA from './02-classify-and-evaluate/prompt.md?raw';
import starterA from './02-classify-and-evaluate/starter.tsx?raw';
import solutionA from './02-classify-and-evaluate/solution.tsx?raw';
import hintsA from './02-classify-and-evaluate/hints.md?raw';
import { checks as checksA } from './02-classify-and-evaluate/checks';
import concept2 from './03-debugging-and-designing.md?raw';
import promptB from './04-cors-middleware/prompt.md?raw';
import starterB from './04-cors-middleware/starter.tsx?raw';
import solutionB from './04-cors-middleware/solution.tsx?raw';
import hintsB from './04-cors-middleware/hints.md?raw';
import { checks as checksB } from './04-cors-middleware/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '65-cors-explained',
  title: 'CORS, explained properly',
  track: 'security',
  summary: 'Simple vs preflighted requests, credentials, and the errors everyone misreads.',
  steps: [
    { kind: 'concept', id: 'cors-is-relaxation', title: 'CORS is the server relaxing the browser\'s rule', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'classify-and-evaluate',
      title: 'Classify a request and grade the CORS response',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'debugging-and-designing', title: 'Debugging and designing for it', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'cors-middleware',
      title: 'Write a CORS middleware',
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
