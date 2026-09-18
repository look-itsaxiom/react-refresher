import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-what-react-19-changed.md?raw';
import promptA from './02-rating-wrapper/prompt.md?raw';
import starterA from './02-rating-wrapper/starter.tsx?raw';
import solutionA from './02-rating-wrapper/solution.tsx?raw';
import hintsA from './02-rating-wrapper/hints.md?raw';
import { checks as checksA } from './02-rating-wrapper/checks';
import concept2 from './03-using-and-choosing.md?raw';
import promptB from './04-slots-and-element-props/prompt.md?raw';
import starterB from './04-slots-and-element-props/starter.tsx?raw';
import solutionB from './04-slots-and-element-props/solution.tsx?raw';
import hintsB from './04-slots-and-element-props/hints.md?raw';
import { checks as checksB } from './04-slots-and-element-props/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '83-web-components-with-react',
  title: 'Web components with React 19',
  track: 'web-components',
  summary: 'Full custom element support in React 19, events, and when to reach for one.',
  steps: [
    { kind: 'concept', id: 'what-react-19-changed', title: 'What React 19 changed for custom elements', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'rating-wrapper',
      title: 'Wrap a custom element in a typed component',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'using-and-choosing', title: 'Using web components from React, and when to bother', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'slots-and-element-props',
      title: 'Slots and the property/attribute decision, as pure functions',
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
