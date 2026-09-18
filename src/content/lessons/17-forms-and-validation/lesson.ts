import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-three-ways-to-build-a-form.md?raw';
import promptA from './02-write-a-tiny-validator/prompt.md?raw';
import starterA from './02-write-a-tiny-validator/starter.tsx?raw';
import solutionA from './02-write-a-tiny-validator/solution.tsx?raw';
import hintsA from './02-write-a-tiny-validator/hints.md?raw';
import { checks as checksA } from './02-write-a-tiny-validator/checks';
import concept2 from './03-validation-and-schemas.md?raw';
import promptB from './04-fix-the-form-action-errors/prompt.md?raw';
import starterB from './04-fix-the-form-action-errors/starter.tsx?raw';
import solutionB from './04-fix-the-form-action-errors/solution.tsx?raw';
import hintsB from './04-fix-the-form-action-errors/hints.md?raw';
import { checks as checksB } from './04-fix-the-form-action-errors/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '17-forms-and-validation',
  title: 'Forms and validation',
  track: 'ecosystem',
  summary: 'Actions vs react-hook-form vs TanStack Form; Zod and Standard Schema.',
  steps: [
    { kind: 'concept', id: 'three-ways-to-build-a-form', title: 'Three ways to build a form in 2026', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'write-a-tiny-validator',
      title: 'Write a tiny validator',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'validation-and-schemas', title: 'Validation and schemas', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'fix-the-form-action-errors',
      title: 'Fix the form action errors',
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
