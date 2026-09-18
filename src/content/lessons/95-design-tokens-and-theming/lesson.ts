import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-tokens-the-vocabulary-layer.md?raw';
import promptA from './02-token-pipeline/prompt.md?raw';
import starterA from './02-token-pipeline/starter.tsx?raw';
import solutionA from './02-token-pipeline/solution.tsx?raw';
import hintsA from './02-token-pipeline/hints.md?raw';
import { checks as checksA } from './02-token-pipeline/checks';
import concept2 from './03-theming-and-dark-mode.md?raw';
import promptB from './04-theme-provider/prompt.md?raw';
import starterB from './04-theme-provider/starter.tsx?raw';
import solutionB from './04-theme-provider/solution.tsx?raw';
import hintsB from './04-theme-provider/hints.md?raw';
import { checks as checksB } from './04-theme-provider/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '95-design-tokens-and-theming',
  title: 'Design tokens and theming',
  track: 'design-systems',
  summary: 'Token pipelines, CSS variables, dark mode, and Tailwind v4 theme config.',
  steps: [
    { kind: 'concept', id: 'tokens-the-vocabulary-layer', title: 'Tokens: the vocabulary layer', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'token-pipeline',
      title: 'Build a miniature token pipeline',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'theming-and-dark-mode', title: 'Theming and dark mode in 2026', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'theme-provider',
      title: 'Build a ThemeProvider with system/light/dark',
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
