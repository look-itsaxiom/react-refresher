import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-typing-components.md?raw';
import promptA from './02-fix-the-button-types/prompt.md?raw';
import starterA from './02-fix-the-button-types/starter.tsx?raw';
import solutionA from './02-fix-the-button-types/solution.tsx?raw';
import hintsA from './02-fix-the-button-types/hints.md?raw';
import { checks as checksA } from './02-fix-the-button-types/checks';
import concept2 from './03-language-features.md?raw';
import promptB from './04-generic-select/prompt.md?raw';
import starterB from './04-generic-select/starter.tsx?raw';
import solutionB from './04-generic-select/solution.tsx?raw';
import hintsB from './04-generic-select/hints.md?raw';
import { checks as checksB } from './04-generic-select/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '20-typescript-react-idioms',
  title: 'TypeScript and React idioms',
  track: 'ecosystem',
  summary: 'ComponentProps, discriminated props, satisfies, no more React.FC debates.',
  steps: [
    { kind: 'concept', id: 'typing-components', title: 'Typing components in 2026', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'fix-the-button-types',
      title: 'Fix the Button types',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'language-features', title: 'Language features that changed how we write React', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'generic-select',
      title: 'Build a generic Select',
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
