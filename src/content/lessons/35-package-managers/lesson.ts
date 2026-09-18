import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-what-a-package-manager-does.md?raw';
import promptA from './02-semver-range-matching/prompt.md?raw';
import starterA from './02-semver-range-matching/starter.tsx?raw';
import solutionA from './02-semver-range-matching/solution.tsx?raw';
import hintsA from './02-semver-range-matching/hints.md?raw';
import { checks as checksA } from './02-semver-range-matching/checks';
import concept2 from './03-choosing-and-operating-in-2026.md?raw';
import promptB from './04-hoisting-and-phantom-deps/prompt.md?raw';
import starterB from './04-hoisting-and-phantom-deps/starter.tsx?raw';
import solutionB from './04-hoisting-and-phantom-deps/solution.tsx?raw';
import hintsB from './04-hoisting-and-phantom-deps/hints.md?raw';
import { checks as checksB } from './04-hoisting-and-phantom-deps/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '35-package-managers',
  title: 'Package managers',
  track: 'tooling',
  summary: 'npm, pnpm, yarn, Bun; lockfiles, workspaces, peer deps, and publishing.',
  steps: [
    { kind: 'concept', id: 'what-a-package-manager-does', title: 'What a package manager actually does', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'semver-range-matching',
      title: 'Implement semver range matching',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'choosing-and-operating-in-2026', title: 'Choosing and operating one in 2026', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'hoisting-and-phantom-deps',
      title: 'Model hoisting and phantom dependencies',
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
