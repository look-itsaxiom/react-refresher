import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-types-from-the-schema.md?raw';
import promptA from './02-schema-codegen/prompt.md?raw';
import starterA from './02-schema-codegen/starter.tsx?raw';
import solutionA from './02-schema-codegen/solution.tsx?raw';
import hintsA from './02-schema-codegen/hints.md?raw';
import { checks as checksA } from './02-schema-codegen/checks';
import concept2 from './03-the-workflow-around-types.md?raw';
import promptB from './04-operation-types/prompt.md?raw';
import starterB from './04-operation-types/starter.tsx?raw';
import solutionB from './04-operation-types/solution.tsx?raw';
import hintsB from './04-operation-types/hints.md?raw';
import { checks as checksB } from './04-operation-types/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '78-graphql-typescript-codegen',
  title: 'GraphQL with TypeScript',
  track: 'graphql',
  summary: 'Codegen, typed documents, and the persisted-query workflow.',
  steps: [
    { kind: 'concept', id: 'types-from-the-schema', title: 'Types from the schema, not by hand', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'schema-codegen',
      title: 'Generate TypeScript from a schema',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'workflow-around-types', title: 'The workflow around types', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'operation-types',
      title: 'Type one operation and persist it',
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
