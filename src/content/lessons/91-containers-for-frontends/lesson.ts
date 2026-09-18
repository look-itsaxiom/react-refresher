import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-images-that-build-fast-and-stay-small.md?raw';
import promptA from './02-dockerfile-tools/prompt.md?raw';
import starterA from './02-dockerfile-tools/starter.tsx?raw';
import solutionA from './02-dockerfile-tools/solution.tsx?raw';
import hintsA from './02-dockerfile-tools/hints.md?raw';
import { checks as checksA } from './02-dockerfile-tools/checks';
import concept2 from './03-serving-the-two-shapes.md?raw';
import promptB from './04-nginx-and-env-tools/prompt.md?raw';
import starterB from './04-nginx-and-env-tools/starter.tsx?raw';
import solutionB from './04-nginx-and-env-tools/solution.tsx?raw';
import hintsB from './04-nginx-and-env-tools/hints.md?raw';
import { checks as checksB } from './04-nginx-and-env-tools/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '91-containers-for-frontends',
  title: 'Containers for frontends',
  track: 'deployment',
  summary: 'Multi-stage Dockerfiles, nginx for SPAs, and running SSR in a container.',
  steps: [
    { kind: 'concept', id: 'images-that-build-fast-and-stay-small', title: 'Images that build fast and stay small', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'dockerfile-tools',
      title: 'Generate and lint a Dockerfile',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'serving-the-two-shapes', title: 'Serving the two shapes: SPA behind nginx, SSR as Node', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'nginx-and-env-tools',
      title: 'Generate an nginx config and resolve env strategy',
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
