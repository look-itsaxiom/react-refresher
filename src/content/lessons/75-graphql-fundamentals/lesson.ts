import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-type-system-and-sdl.md?raw';
import promptA from './02-schema-parser/prompt.md?raw';
import starterA from './02-schema-parser/starter.tsx?raw';
import solutionA from './02-schema-parser/solution.tsx?raw';
import hintsA from './02-schema-parser/hints.md?raw';
import { checks as checksA } from './02-schema-parser/checks';
import concept2 from './03-execution-model.md?raw';
import promptB from './04-query-execution/prompt.md?raw';
import starterB from './04-query-execution/starter.tsx?raw';
import solutionB from './04-query-execution/solution.tsx?raw';
import hintsB from './04-query-execution/hints.md?raw';
import { checks as checksB } from './04-query-execution/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '75-graphql-fundamentals',
  title: 'GraphQL fundamentals',
  track: 'graphql',
  summary: 'SDL, the type system, queries, mutations, subscriptions, and introspection.',
  steps: [
    { kind: 'concept', id: 'type-system-and-sdl', title: 'A type system with a query language on top', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'schema-parser',
      title: 'Parse and validate a schema from SDL',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'execution-model', title: 'How a query executes', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'query-execution',
      title: 'Parse and execute a GraphQL query',
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
