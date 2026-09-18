import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-server-state-is-a-cache-problem.md?raw';
import prompt1 from './02-mini-use-query/prompt.md?raw';
import starter1 from './02-mini-use-query/starter.tsx?raw';
import solution1 from './02-mini-use-query/solution.tsx?raw';
import hints1 from './02-mini-use-query/hints.md?raw';
import { checks as checks1 } from './02-mini-use-query/checks';
import concept2 from './03-mutations-and-invalidation.md?raw';
import prompt2 from './04-mini-use-mutation/prompt.md?raw';
import starter2 from './04-mini-use-mutation/starter.tsx?raw';
import solution2 from './04-mini-use-mutation/solution.tsx?raw';
import hints2 from './04-mini-use-mutation/hints.md?raw';
import { checks as checks2 } from './04-mini-use-mutation/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '15-server-state-tanstack-query',
  title: 'Server state with TanStack Query',
  track: 'ecosystem',
  summary: 'Queries, mutations, invalidation, and why useEffect fetching is gone.',
  steps: [
    { kind: 'concept', id: 'server-state-is-a-cache-problem', title: 'Server state is a cache problem', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'mini-use-query',
      title: 'Build a miniature useQuery',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    {
      kind: 'concept',
      id: 'mutations-and-invalidation',
      title: 'Mutations, invalidation, and where it meets React 19/RSC',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'mini-use-mutation',
      title: 'Add an optimistic mutation with invalidation',
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
