import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-apollo-client-4-in-a-react-19-app.md?raw';
import prompt1 from './02-mini-apollo-hooks/prompt.md?raw';
import starter1 from './02-mini-apollo-hooks/starter.tsx?raw';
import solution1 from './02-mini-apollo-hooks/solution.tsx?raw';
import hints1 from './02-mini-apollo-hooks/hints.md?raw';
import { checks as checks1 } from './02-mini-apollo-hooks/checks';
import concept2 from './03-the-cache-is-the-state-manager.md?raw';
import prompt2 from './04-type-policies-and-pagination/prompt.md?raw';
import miniClient from './04-type-policies-and-pagination/mini-client.ts?raw';
import starter2 from './04-type-policies-and-pagination/starter.tsx?raw';
import solution2 from './04-type-policies-and-pagination/solution.tsx?raw';
import hints2 from './04-type-policies-and-pagination/hints.md?raw';
import { checks as checks2 } from './04-type-policies-and-pagination/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '111-apollo-client-in-react',
  title: 'Apollo Client in React',
  track: 'graphql',
  summary: 'Normalized cache and typePolicies, fragments, useQuery and useMutation, optimistic updates, pagination, codegen.',
  steps: [
    {
      kind: 'concept',
      id: 'apollo-client-4-in-a-react-19-app',
      title: 'Apollo Client 4 in a React 19 app',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'mini-apollo-hooks',
      title: 'Build useQuery and useMutation on a mini InMemoryCache',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    {
      kind: 'concept',
      id: 'the-cache-is-the-state-manager',
      title: 'The cache is the state manager',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'type-policies-and-pagination',
      title: 'typePolicies, keyArgs, and relay-style pagination',
      prompt: prompt2,
      files: { 'App.tsx': starter2, 'mini-client.ts': miniClient },
      solution: { 'App.tsx': solution2, 'mini-client.ts': miniClient },
      hints: splitHints(hints2),
      checks: checks2,
    },
    quiz,
  ],
};

export default lesson;
