import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-bem-to-layers.md?raw';
import promptA from './02-layer-stylesheet/prompt.md?raw';
import starterA from './02-layer-stylesheet/starter.tsx?raw';
import solutionA from './02-layer-stylesheet/solution.tsx?raw';
import hintsA from './02-layer-stylesheet/hints.md?raw';
import { checks as checksA } from './02-layer-stylesheet/checks';
import concept2 from './03-architecture-for-2026.md?raw';
import promptB from './04-component-variants/prompt.md?raw';
import starterB from './04-component-variants/starter.tsx?raw';
import solutionB from './04-component-variants/solution.tsx?raw';
import hintsB from './04-component-variants/hints.md?raw';
import { checks as checksB } from './04-component-variants/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '94-css-architecture',
  title: 'CSS architecture',
  track: 'design-systems',
  summary: 'BEM to utility-first, CSS Modules, cascade layers, and scoping strategies.',
  steps: [
    { kind: 'concept', id: 'bem-to-layers', title: 'From BEM to layers: what each generation fixed', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'layer-stylesheet',
      title: 'Model the layered cascade',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'architecture-for-2026', title: 'An architecture for a React app in 2026', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'component-variants',
      title: 'Build a component-variant architecture',
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
