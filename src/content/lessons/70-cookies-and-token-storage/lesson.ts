import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-cookie-attributes.md?raw';
import promptA from './02-cookie-parser/prompt.md?raw';
import starterA from './02-cookie-parser/starter.tsx?raw';
import solutionA from './02-cookie-parser/solution.tsx?raw';
import hintsA from './02-cookie-parser/hints.md?raw';
import { checks as checksA } from './02-cookie-parser/checks';
import concept2 from './03-token-storage.md?raw';
import promptB from './04-storage-risk/prompt.md?raw';
import starterB from './04-storage-risk/starter.tsx?raw';
import solutionB from './04-storage-risk/solution.tsx?raw';
import hintsB from './04-storage-risk/hints.md?raw';
import { checks as checksB } from './04-storage-risk/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '70-cookies-and-token-storage',
  title: 'Cookies and token storage',
  track: 'auth',
  summary: 'HttpOnly, Secure, SameSite, partitioned cookies, and why localStorage tokens are risky.',
  steps: [
    { kind: 'concept', id: 'cookie-attributes', title: 'Cookies, attribute by attribute', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'cookie-parser',
      title: 'Parse, validate, and serialize a Set-Cookie header',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'token-storage', title: 'Where a token may live', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'storage-risk',
      title: 'Grade a token-storage plan, and hold a token safely in memory',
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
