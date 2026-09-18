import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-types-as-a-language.md?raw';
import promptA from './02-typed-router/prompt.md?raw';
import starterA from './02-typed-router/starter.tsx?raw';
import solutionA from './02-typed-router/solution.tsx?raw';
import hintsA from './02-typed-router/hints.md?raw';
import { checks as checksA } from './02-typed-router/checks';
import concept2 from './03-typescript-6-and-7.md?raw';
import promptB from './04-typed-query-builder/prompt.md?raw';
import starterB from './04-typed-query-builder/starter.tsx?raw';
import solutionB from './04-typed-query-builder/solution.tsx?raw';
import hintsB from './04-typed-query-builder/hints.md?raw';
import { checks as checksB } from './04-typed-query-builder/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '34-typescript-advanced',
  title: 'TypeScript beyond the basics',
  track: 'javascript-typescript',
  summary: 'Generics, conditional and template literal types, satisfies, type-level tests, and TypeScript 7.',
  steps: [
    { kind: 'concept', id: 'types-as-a-language', title: 'Types as a programming language', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'typed-router',
      title: 'Build a typed router',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'typescript-6-and-7', title: 'TypeScript 6 and 7 in practice', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'typed-query-builder',
      title: 'Build a schema-typed query builder',
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
