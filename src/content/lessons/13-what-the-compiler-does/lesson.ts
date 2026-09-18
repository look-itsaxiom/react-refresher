import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-what-the-compiler-does.md?raw';
import promptA from './02-fix-without-memoization/prompt.md?raw';
import starterA from './02-fix-without-memoization/starter.tsx?raw';
import solutionA from './02-fix-without-memoization/solution.tsx?raw';
import hintsA from './02-fix-without-memoization/hints.md?raw';
import { checks as checksA } from './02-fix-without-memoization/checks';
import concept2 from './03-rules-and-adoption.md?raw';
import promptB from './04-remove-unnecessary-memoization/prompt.md?raw';
import starterB from './04-remove-unnecessary-memoization/starter.tsx?raw';
import solutionB from './04-remove-unnecessary-memoization/solution.tsx?raw';
import hintsB from './04-remove-unnecessary-memoization/hints.md?raw';
import { checks as checksB } from './04-remove-unnecessary-memoization/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '13-what-the-compiler-does',
  title: 'What the React Compiler does',
  track: 'compiler',
  summary: 'Automatic memoization, the rules it relies on, and reading its output.',
  steps: [
    { kind: 'concept', id: 'what-the-compiler-does', title: 'What the Compiler does', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'fix-without-memoization',
      title: 'Fix the leaderboard, no memoization needed',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'rules-and-adoption', title: 'The rules it relies on, and how to adopt it', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'remove-unnecessary-memoization',
      title: 'Clean up the manual memoization',
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
