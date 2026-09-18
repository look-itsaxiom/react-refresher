import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-fragments-variables-directives.md?raw';
import promptA from './02-expand-document/prompt.md?raw';
import starterA from './02-expand-document/starter.tsx?raw';
import solutionA from './02-expand-document/solution.tsx?raw';
import hintsA from './02-expand-document/hints.md?raw';
import { checks as checksA } from './02-expand-document/checks';
import concept2 from './03-pagination-mutations-errors.md?raw';
import promptB from './04-pagination-and-mutations/prompt.md?raw';
import starterB from './04-pagination-and-mutations/starter.tsx?raw';
import solutionB from './04-pagination-and-mutations/solution.tsx?raw';
import hintsB from './04-pagination-and-mutations/hints.md?raw';
import { checks as checksB } from './04-pagination-and-mutations/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '76-graphql-operations',
  title: 'Writing good operations',
  track: 'graphql',
  summary: 'Fragments, variables, directives, pagination patterns, and error handling.',
  steps: [
    {
      kind: 'concept',
      id: 'fragments-variables-directives',
      title: 'Operations that scale with the schema',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'expand-document',
      title: 'Expand fragments, inline fragments, and directives',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'pagination-mutations-errors',
      title: 'Pagination, mutations, and errors',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'pagination-and-mutations',
      title: 'Relay-style pagination and mutation payloads',
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
