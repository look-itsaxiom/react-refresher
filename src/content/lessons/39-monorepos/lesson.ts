import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-why-and-how-to-monorepo.md?raw';
import promptA from './02-build-graphs-and-filters/prompt.md?raw';
import starterA from './02-build-graphs-and-filters/starter.tsx?raw';
import solutionA from './02-build-graphs-and-filters/solution.tsx?raw';
import hintsA from './02-build-graphs-and-filters/hints.md?raw';
import { checks as checksA } from './02-build-graphs-and-filters/checks';
import concept2 from './03-task-orchestration-and-releases.md?raw';
import promptB from './04-versions-and-changesets/prompt.md?raw';
import starterB from './04-versions-and-changesets/starter.tsx?raw';
import solutionB from './04-versions-and-changesets/solution.tsx?raw';
import hintsB from './04-versions-and-changesets/hints.md?raw';
import { checks as checksB } from './04-versions-and-changesets/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '39-monorepos',
  title: 'Monorepos',
  track: 'tooling',
  summary: 'pnpm workspaces, Turborepo, Nx, shared configs, and versioning with Changesets.',
  steps: [
    { kind: 'concept', id: 'why-and-how-to-monorepo', title: 'Why and how to monorepo', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'build-graphs-and-filters',
      title: 'Build order, affected packages, and filter expressions',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'task-orchestration-and-releases', title: 'Task orchestration and releases', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'versions-and-changesets',
      title: 'Resolve workspace versions and bump changesets',
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
