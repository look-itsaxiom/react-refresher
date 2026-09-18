import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-a-private-dom-tree.md?raw';
import promptA from './02-x-card/prompt.md?raw';
import starterA from './02-x-card/starter.tsx?raw';
import solutionA from './02-x-card/solution.tsx?raw';
import hintsA from './02-x-card/hints.md?raw';
import { checks as checksA } from './02-x-card/checks';
import concept2 from './03-styling-and-rendering-shadow-trees.md?raw';
import promptB from './04-declarative-shadow-dom/prompt.md?raw';
import starterB from './04-declarative-shadow-dom/starter.tsx?raw';
import solutionB from './04-declarative-shadow-dom/solution.tsx?raw';
import hintsB from './04-declarative-shadow-dom/hints.md?raw';
import { checks as checksB } from './04-declarative-shadow-dom/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '81-shadow-dom-and-slots',
  title: 'Shadow DOM, templates, and slots',
  track: 'web-components',
  summary: 'Encapsulation, ::part and CSS shadow parts, adoptedStyleSheets, and declarative Shadow DOM.',
  steps: [
    { kind: 'concept', id: 'a-private-dom-tree', title: 'A private DOM tree', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'x-card',
      title: 'Build <x-card> with slots, parts, and a themeable style boundary',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'styling-and-rendering-shadow-trees', title: 'Styling and rendering shadow trees', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'declarative-shadow-dom',
      title: 'Render and hydrate declarative Shadow DOM',
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
