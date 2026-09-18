import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-static-generation-pipeline.md?raw';
import promptA from './02-content-collections/prompt.md?raw';
import starterA from './02-content-collections/starter.tsx?raw';
import solutionA from './02-content-collections/solution.tsx?raw';
import hintsA from './02-content-collections/hints.md?raw';
import { checks as checksA } from './02-content-collections/checks';
import concept2 from './03-ssg-landscape-2026.md?raw';
import promptB from './04-incremental-build-planner/prompt.md?raw';
import starterB from './04-incremental-build-planner/starter.tsx?raw';
import solutionB from './04-incremental-build-planner/solution.tsx?raw';
import hintsB from './04-incremental-build-planner/hints.md?raw';
import { checks as checksB } from './04-incremental-build-planner/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '47-static-site-generators',
  title: 'Static site generators',
  track: 'rendering',
  summary: 'Astro, Eleventy, Docusaurus, VitePress; content collections, MDX, and build-time data.',
  steps: [
    {
      kind: 'concept',
      id: 'static-generation-pipeline',
      title: 'Static generation as a data pipeline',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'content-collections',
      title: 'Build a typed content collection',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'ssg-landscape-2026',
      title: 'The 2026 SSG landscape and when to hybridize',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'incremental-build-planner',
      title: 'Plan an incremental build',
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
