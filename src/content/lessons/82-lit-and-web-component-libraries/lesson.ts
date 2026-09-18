import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-lits-model.md?raw';
import promptA from './02-reactive-element-mini/prompt.md?raw';
import starterA from './02-reactive-element-mini/starter.tsx?raw';
import solutionA from './02-reactive-element-mini/solution.tsx?raw';
import hintsA from './02-reactive-element-mini/hints.md?raw';
import { checks as checksA } from './02-reactive-element-mini/checks';
import concept2 from './03-ecosystem-and-design-systems.md?raw';
import promptB from './04-html-template-mini/prompt.md?raw';
import starterB from './04-html-template-mini/starter.tsx?raw';
import solutionB from './04-html-template-mini/solution.tsx?raw';
import hintsB from './04-html-template-mini/hints.md?raw';
import { checks as checksB } from './04-html-template-mini/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '82-lit-and-web-component-libraries',
  title: 'Lit and the web component ecosystem',
  track: 'web-components',
  summary: 'Reactive properties, templates, and design systems shipped as web components.',
  steps: [
    { kind: 'concept', id: 'lits-model', title: "Lit's model: reactive properties and efficient templates", markdown: concept1 },
    {
      kind: 'exercise',
      id: 'reactive-element-mini',
      title: 'Build a ReactiveElement mini base class',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'ecosystem-and-design-systems', title: 'The ecosystem and the design-system question', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'html-template-mini',
      title: 'Fix a mini lit-html renderer',
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
