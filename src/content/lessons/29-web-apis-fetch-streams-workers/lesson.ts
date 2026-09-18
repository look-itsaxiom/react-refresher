import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-fetch-properly.md?raw';
import promptA from './02-stream-ndjson/prompt.md?raw';
import starterA from './02-stream-ndjson/starter.tsx?raw';
import solutionA from './02-stream-ndjson/solution.tsx?raw';
import hintsA from './02-stream-ndjson/hints.md?raw';
import { checks as checksA } from './02-stream-ndjson/checks';
import concept2 from './03-off-the-main-thread.md?raw';
import promptB from './04-worker-client/prompt.md?raw';
import starterB from './04-worker-client/starter.tsx?raw';
import solutionB from './04-worker-client/solution.tsx?raw';
import hintsB from './04-worker-client/hints.md?raw';
import { checks as checksB } from './04-worker-client/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '29-web-apis-fetch-streams-workers',
  title: 'Web APIs: Fetch, streams, workers',
  track: 'web-platform',
  summary: 'AbortController, ReadableStream, Web Workers, Broadcast Channel, and structured clone.',
  steps: [
    { kind: 'concept', id: 'fetch-properly', title: 'Fetch, properly', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'stream-ndjson',
      title: 'Read a streaming response as it arrives',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'off-the-main-thread',
      title: 'Off the main thread, and across contexts',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'worker-client',
      title: 'Build a request/response protocol for a worker',
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
