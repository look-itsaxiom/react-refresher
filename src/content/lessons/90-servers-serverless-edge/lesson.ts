import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-three-shapes.md?raw';
import promptA from './02-portable-handler/prompt.md?raw';
import starterA from './02-portable-handler/starter.tsx?raw';
import solutionA from './02-portable-handler/solution.tsx?raw';
import hintsA from './02-portable-handler/hints.md?raw';
import { checks as checksA } from './02-portable-handler/checks';
import concept2 from './03-cold-starts-and-placement.md?raw';
import promptB from './04-invocation-simulator/prompt.md?raw';
import starterB from './04-invocation-simulator/starter.tsx?raw';
import solutionB from './04-invocation-simulator/solution.tsx?raw';
import hintsB from './04-invocation-simulator/hints.md?raw';
import { checks as checksB } from './04-invocation-simulator/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '90-servers-serverless-edge',
  title: 'Servers, serverless, and edge',
  track: 'deployment',
  summary: 'Node hosts, Railway and Render, serverless functions, edge runtimes, and cold starts.',
  steps: [
    { kind: 'concept', id: 'three-shapes', title: 'Three shapes of a backend for a frontend', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'portable-handler',
      title: 'Build a portable fetch handler',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'cold-starts-and-placement',
      title: 'Cold starts, latency, and where to put the code',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'invocation-simulator',
      title: 'Simulate cold starts across three hosting models',
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
