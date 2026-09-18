import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-three-ways-to-ask-a-server-for-data.md?raw';
import promptA from './02-dataloader-batching/prompt.md?raw';
import starterA from './02-dataloader-batching/starter.tsx?raw';
import solutionA from './02-dataloader-batching/solution.tsx?raw';
import hintsA from './02-dataloader-batching/hints.md?raw';
import { checks as checksA } from './02-dataloader-batching/checks';
import concept2 from './03-operating-graphql-safely-at-scale.md?raw';
import promptB from './04-query-cost-and-api-choice/prompt.md?raw';
import starterB from './04-query-cost-and-api-choice/starter.tsx?raw';
import solutionB from './04-query-cost-and-api-choice/solution.tsx?raw';
import hintsB from './04-query-cost-and-api-choice/hints.md?raw';
import { checks as checksB } from './04-query-cost-and-api-choice/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '79-graphql-vs-rest-vs-trpc',
  title: 'GraphQL vs REST vs tRPC',
  track: 'graphql',
  summary: 'When each wins, N+1 and security concerns, and federation at scale.',
  steps: [
    { kind: 'concept', id: 'three-ways-to-ask-a-server-for-data', title: 'Three ways to ask a server for data', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'dataloader-batching',
      title: 'Fix N+1 with a batching loader',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'operating-graphql-safely-at-scale', title: 'Operating GraphQL safely at scale', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'query-cost-and-api-choice',
      title: 'Score query cost, and pick the right API style',
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
