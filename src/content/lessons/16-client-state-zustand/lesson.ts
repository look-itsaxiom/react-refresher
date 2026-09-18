import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-client-vs-server-state.md?raw';
import promptA from './02-build-a-tiny-create/prompt.md?raw';
import starterA from './02-build-a-tiny-create/starter.tsx?raw';
import solutionA from './02-build-a-tiny-create/solution.tsx?raw';
import hintsA from './02-build-a-tiny-create/hints.md?raw';
import { checks as checksA } from './02-build-a-tiny-create/checks';
import concept2 from './03-zustand-patterns-and-alternatives.md?raw';
import promptB from './04-fix-the-cart-store/prompt.md?raw';
import starterB from './04-fix-the-cart-store/starter.tsx?raw';
import solutionB from './04-fix-the-cart-store/solution.tsx?raw';
import hintsB from './04-fix-the-cart-store/hints.md?raw';
import { checks as checksB } from './04-fix-the-cart-store/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '16-client-state-zustand',
  title: 'Client state with Zustand and friends',
  track: 'ecosystem',
  summary: 'Stores without boilerplate; when context is enough.',
  steps: [
    { kind: 'concept', id: 'client-vs-server-state', title: 'What client state actually is', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'build-a-tiny-create',
      title: 'Build a tiny create()',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'zustand-patterns-and-alternatives', title: 'Zustand patterns and the alternatives', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'fix-the-cart-store',
      title: 'Fix the cart store',
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
