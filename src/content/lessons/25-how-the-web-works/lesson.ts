import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-from-url-to-first-byte.md?raw';
import promptA from './02-url-toolkit/prompt.md?raw';
import starterA from './02-url-toolkit/starter.tsx?raw';
import solutionA from './02-url-toolkit/solution.tsx?raw';
import hintsA from './02-url-toolkit/hints.md?raw';
import { checks as checksA } from './02-url-toolkit/checks';
import concept2 from './03-first-byte-to-first-paint.md?raw';
import promptB from './04-fetch-with-retry/prompt.md?raw';
import starterB from './04-fetch-with-retry/starter.tsx?raw';
import solutionB from './04-fetch-with-retry/solution.tsx?raw';
import hintsB from './04-fetch-with-retry/hints.md?raw';
import { checks as checksB } from './04-fetch-with-retry/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '25-how-the-web-works',
  title: 'How the web works, revisited',
  track: 'web-platform',
  summary: 'DNS, TLS, HTTP/1.1 vs 2 vs 3, hosting, and what happens between typing a URL and first paint.',
  steps: [
    { kind: 'concept', id: 'from-url-to-first-byte', title: 'From URL to first byte', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'url-toolkit',
      title: 'Build a URL toolkit',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'first-byte-to-first-paint',
      title: 'From first byte to first paint, and where your code runs',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'fetch-with-retry',
      title: 'Retry a flaky request without hammering the server',
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
