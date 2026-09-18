import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-code-the-compiler-can-trust.md?raw';
import prompt1 from './02-fix-the-violations/prompt.md?raw';
import starter1 from './02-fix-the-violations/starter.tsx?raw';
import solution1 from './02-fix-the-violations/solution.tsx?raw';
import hints1 from './02-fix-the-violations/hints.md?raw';
import { checks as checks1 } from './02-fix-the-violations/checks';
import concept2 from './03-when-memoization-still-matters.md?raw';
import prompt2 from './04-stabilize-the-callback/prompt.md?raw';
import starter2 from './04-stabilize-the-callback/starter.tsx?raw';
import solution2 from './04-stabilize-the-callback/solution.tsx?raw';
import hints2 from './04-stabilize-the-callback/hints.md?raw';
import { checks as checks2 } from './04-stabilize-the-callback/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '14-compiler-friendly-code',
  title: 'Writing compiler-friendly code',
  track: 'compiler',
  summary: 'Purity, mutation, and when useMemo/useCallback still matter.',
  steps: [
    { kind: 'concept', id: 'code-the-compiler-can-trust', title: 'Code the Compiler can trust', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'fix-the-violations',
      title: 'Fix three rule violations',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    { kind: 'concept', id: 'when-memoization-still-matters', title: 'When manual memoization still matters', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'stabilize-the-callback',
      title: 'Stop a memoized child from re-rendering',
      prompt: prompt2,
      files: { 'App.tsx': starter2 },
      solution: { 'App.tsx': solution2 },
      hints: splitHints(hints2),
      checks: checks2,
    },
    quiz,
  ],
};

export default lesson;
