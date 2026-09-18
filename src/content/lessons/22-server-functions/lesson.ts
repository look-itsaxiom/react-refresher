import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-use-server-boundary.md?raw';
import promptA from './02-harden-a-server-function/prompt.md?raw';
import starterA from './02-harden-a-server-function/starter.tsx?raw';
import solutionA from './02-harden-a-server-function/solution.tsx?raw';
import hintsA from './02-harden-a-server-function/hints.md?raw';
import { checks as checksA } from './02-harden-a-server-function/checks';
import concept2 from './03-revalidation-and-caching.md?raw';
import promptB from './04-tag-based-revalidation/prompt.md?raw';
import starterB from './04-tag-based-revalidation/starter.tsx?raw';
import solutionB from './04-tag-based-revalidation/solution.tsx?raw';
import hintsB from './04-tag-based-revalidation/hints.md?raw';
import { checks as checksB } from './04-tag-based-revalidation/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '22-server-functions',
  title: 'Server Functions',
  track: 'server',
  summary: '"use server", calling the server from forms and events, revalidation.',
  steps: [
    { kind: 'concept', id: 'use-server-boundary', title: "'use server' is an RPC boundary", markdown: concept1 },
    {
      kind: 'exercise',
      id: 'harden-a-server-function',
      title: 'Harden a server function',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'revalidation-and-caching',
      title: 'After the mutation: revalidation and caching',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'tag-based-revalidation',
      title: 'Build a tag-based cache',
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
