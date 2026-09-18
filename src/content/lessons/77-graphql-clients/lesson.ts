import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-document-vs-normalized-caches.md?raw';
import prompt1 from './02-normalized-cache/prompt.md?raw';
import starter1 from './02-normalized-cache/starter.tsx?raw';
import solution1 from './02-normalized-cache/solution.tsx?raw';
import hints1 from './02-normalized-cache/hints.md?raw';
import { checks as checks1 } from './02-normalized-cache/checks';
import concept2 from './03-mutations-optimism-and-architecture.md?raw';
import prompt2 from './04-use-graphql/prompt.md?raw';
import starter2 from './04-use-graphql/starter.tsx?raw';
import solution2 from './04-use-graphql/solution.tsx?raw';
import hints2 from './04-use-graphql/hints.md?raw';
import { checks as checks2 } from './04-use-graphql/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '77-graphql-clients',
  title: 'Apollo, urql, Relay',
  track: 'graphql',
  summary: 'Normalized caches, optimistic updates, and client architecture.',
  steps: [
    {
      kind: 'concept',
      id: 'document-vs-normalized-caches',
      title: 'Document caches vs normalized caches',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'normalized-cache',
      title: 'Build a normalized cache',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    {
      kind: 'concept',
      id: 'mutations-optimism-and-architecture',
      title: 'Mutations, optimism, and client architecture',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'use-graphql',
      title: 'Build useGraphQL and useMutationGQL on the cache',
      prompt: prompt2,
      files: { 'App.tsx': starter2 },
      solution: { 'App.tsx': solution2 },
      hints: splitHints(hints2),
      checks: checks2,
    },
    quiz,
  ],
};

export default lesson;
