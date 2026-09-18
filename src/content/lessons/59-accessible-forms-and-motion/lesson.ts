import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-forms-everyone-can-complete.md?raw';
import promptA from './02-error-summary-and-identification/prompt.md?raw';
import starterA from './02-error-summary-and-identification/starter.tsx?raw';
import solutionA from './02-error-summary-and-identification/solution.tsx?raw';
import hintsA from './02-error-summary-and-identification/hints.md?raw';
import { checks as checksA } from './02-error-summary-and-identification/checks';
import concept2 from './03-color-contrast-and-motion.md?raw';
import promptB from './04-color-and-motion/prompt.md?raw';
import starterB from './04-color-and-motion/starter.tsx?raw';
import solutionB from './04-color-and-motion/solution.tsx?raw';
import hintsB from './04-color-and-motion/hints.md?raw';
import { checks as checksB } from './04-color-and-motion/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '59-accessible-forms-and-motion',
  title: 'Accessible forms, color, and motion',
  track: 'accessibility',
  summary: 'Labels and errors, contrast, prefers-reduced-motion, and announcing changes.',
  steps: [
    { kind: 'concept', id: 'forms-everyone-can-complete', title: 'Forms that everyone can complete', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'error-summary-and-identification',
      title: 'Error summary and identification',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'color-contrast-and-motion', title: 'Color, contrast, and motion', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'color-and-motion',
      title: 'Color and motion',
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
