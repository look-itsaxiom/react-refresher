import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-two-architectures.md?raw';
import promptA from './02-session-store/prompt.md?raw';
import starterA from './02-session-store/starter.tsx?raw';
import solutionA from './02-session-store/solution.tsx?raw';
import hintsA from './02-session-store/hints.md?raw';
import { checks as checksA } from './02-session-store/checks';
import concept2 from './03-bff-pattern.md?raw';
import promptB from './04-bff/prompt.md?raw';
import starterB from './04-bff/starter.tsx?raw';
import solutionB from './04-bff/solution.tsx?raw';
import hintsB from './04-bff/hints.md?raw';
import { checks as checksB } from './04-bff/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '69-sessions-vs-tokens',
  title: 'Sessions vs tokens',
  track: 'auth',
  summary: 'Cookie sessions, bearer tokens, where each breaks, and the BFF pattern.',
  steps: [
    { kind: 'concept', id: 'two-architectures', title: 'Two architectures, precisely', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'session-store',
      title: 'Build a session store with real lifecycle rules',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'bff-pattern', title: 'The BFF pattern and the current recommendation', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'bff',
      title: 'Model the token handler',
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
