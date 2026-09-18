import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-data-on-the-server.md?raw';
import promptA from './02-safe-state-serialization/prompt.md?raw';
import starterA from './02-safe-state-serialization/starter.tsx?raw';
import solutionA from './02-safe-state-serialization/solution.tsx?raw';
import hintsA from './02-safe-state-serialization/hints.md?raw';
import { checks as checksA } from './02-safe-state-serialization/checks';
import concept2 from './03-streaming-caching-platform-limits.md?raw';
import promptB from './04-request-scoped-caching/prompt.md?raw';
import starterB from './04-request-scoped-caching/starter.tsx?raw';
import solutionB from './04-request-scoped-caching/solution.tsx?raw';
import hintsB from './04-request-scoped-caching/hints.md?raw';
import { checks as checksB } from './04-request-scoped-caching/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '46-ssr-in-practice',
  title: 'SSR in practice',
  track: 'rendering',
  summary: 'Data loading, caching, streaming with Suspense, and what runs where in Next.js and React Router.',
  steps: [
    { kind: 'concept', id: 'data-on-the-server', title: 'Data on the server, then the client', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'safe-state-serialization',
      title: 'Serialize state without opening a script tag',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'streaming-caching-platform-limits',
      title: 'Streaming, caching, and platform limits',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'request-scoped-caching',
      title: 'Cache within a request, not across requests',
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
