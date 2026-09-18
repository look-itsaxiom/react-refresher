import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-how-the-landscape-settled.md?raw';
import promptA from './02-variant-builder/prompt.md?raw';
import starterA from './02-variant-builder/starter.tsx?raw';
import solutionA from './02-variant-builder/solution.tsx?raw';
import hintsA from './02-variant-builder/hints.md?raw';
import { checks as checksA } from './02-variant-builder/checks';
import concept2 from './03-component-styling-patterns.md?raw';
import promptB from './04-theme-with-css-variables/prompt.md?raw';
import starterB from './04-theme-with-css-variables/starter.tsx?raw';
import solutionB from './04-theme-with-css-variables/solution.tsx?raw';
import hintsB from './04-theme-with-css-variables/hints.md?raw';
import { checks as checksB } from './04-theme-with-css-variables/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '18-styling-in-2026',
  title: 'Styling in 2026',
  track: 'ecosystem',
  summary: 'Tailwind v4, CSS Modules, and why runtime CSS-in-JS faded.',
  steps: [
    { kind: 'concept', id: 'how-the-landscape-settled', title: 'How the landscape settled', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'variant-builder',
      title: 'Build a cva-style variant builder',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'component-styling-patterns', title: 'Component styling patterns', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'theme-with-css-variables',
      title: 'Theme a component with CSS variables',
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
