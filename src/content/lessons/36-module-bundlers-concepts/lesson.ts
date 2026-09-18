import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-graph-to-bundles.md?raw';
import promptA from './02-module-graph/prompt.md?raw';
import starterA from './02-module-graph/starter.tsx?raw';
import solutionA from './02-module-graph/solution.tsx?raw';
import hintsA from './02-module-graph/hints.md?raw';
import { checks as checksA } from './02-module-graph/checks';
import concept2 from './03-splitting-loading-dev-speed.md?raw';
import promptB from './04-code-splitting/prompt.md?raw';
import starterB from './04-code-splitting/starter.tsx?raw';
import solutionB from './04-code-splitting/solution.tsx?raw';
import hintsB from './04-code-splitting/hints.md?raw';
import { checks as checksB } from './04-code-splitting/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '36-module-bundlers-concepts',
  title: 'How module bundlers work',
  track: 'tooling',
  summary: 'Module graphs, tree shaking, code splitting, HMR, source maps, and ESM/CJS interop.',
  steps: [
    { kind: 'concept', id: 'graph-to-bundles', title: 'From files to a graph to bundles', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'module-graph',
      title: 'Build a module graph and tree-shake it',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'splitting-loading-dev-speed', title: 'Splitting, loading, and dev speed', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'code-splitting',
      title: 'Split a module graph into chunks',
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
