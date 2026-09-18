import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-how-modules-load.md?raw';
import promptA from './02-resolve-specifier/prompt.md?raw';
import starterA from './02-resolve-specifier/starter.tsx?raw';
import solutionA from './02-resolve-specifier/solution.tsx?raw';
import hintsA from './02-resolve-specifier/hints.md?raw';
import { checks as checksA } from './02-resolve-specifier/checks';
import concept2 from './03-node-packages-dual.md?raw';
import promptB from './04-package-exports/prompt.md?raw';
import starterB from './04-package-exports/starter.tsx?raw';
import solutionB from './04-package-exports/solution.tsx?raw';
import hintsB from './04-package-exports/hints.md?raw';
import { checks as checksB } from './04-package-exports/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '33-modules-and-import-maps',
  title: 'ES modules in the browser and Node',
  track: 'javascript-typescript',
  summary: 'ESM vs CJS, import maps, top-level await, dynamic import, and dual packages.',
  steps: [
    { kind: 'concept', id: 'how-modules-load', title: 'How modules actually load', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'resolve-specifier',
      title: 'Resolve a bare specifier through an import map',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'node-packages-dual', title: 'Node, packages, and the dual-package mess', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'package-exports',
      title: 'Resolve package.json exports and spot a dual-package hazard',
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
