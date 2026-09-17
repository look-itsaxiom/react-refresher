import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-actions.md?raw';
import promptA from './02-convert-the-form-to-an-action/prompt.md?raw';
import starterA from './02-convert-the-form-to-an-action/starter.tsx?raw';
import solutionA from './02-convert-the-form-to-an-action/solution.tsx?raw';
import hintsA from './02-convert-the-form-to-an-action/hints.md?raw';
import { checks as checksA } from './02-convert-the-form-to-an-action/checks';
import concept2 from './03-optimistic-ui.md?raw';
import promptB from './04-add-optimistic-todos/prompt.md?raw';
import starterB from './04-add-optimistic-todos/starter.tsx?raw';
import solutionB from './04-add-optimistic-todos/solution.tsx?raw';
import hintsB from './04-add-optimistic-todos/hints.md?raw';
import { checks as checksB } from './04-add-optimistic-todos/checks';

const lesson: Lesson = {
  id: '03-actions-and-optimistic-ui',
  title: 'Actions and optimistic UI',
  track: 'react19',
  summary: 'useActionState, useFormStatus, form actions, useOptimistic.',
  steps: [
    { kind: 'concept', id: 'actions', title: 'Actions', markdown: concept1 },
    { kind: 'exercise', id: 'convert-the-form-to-an-action', title: 'Convert the form to an action', prompt: promptA, files: { 'App.tsx': starterA }, solution: { 'App.tsx': solutionA }, hints: splitHints(hintsA), checks: checksA },
    { kind: 'concept', id: 'optimistic-ui', title: 'Optimistic UI', markdown: concept2 },
    { kind: 'exercise', id: 'add-optimistic-todos', title: 'Add optimistic todos', prompt: promptB, files: { 'App.tsx': starterB }, solution: { 'App.tsx': solutionB }, hints: splitHints(hintsB), checks: checksB },
  ],
};

export default lesson;
