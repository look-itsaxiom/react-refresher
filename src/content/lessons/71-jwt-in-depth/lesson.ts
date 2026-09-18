import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-anatomy-and-verification.md?raw';
import promptA from './02-decode-and-verify/prompt.md?raw';
import starterA from './02-decode-and-verify/starter.tsx?raw';
import solutionA from './02-decode-and-verify/solution.tsx?raw';
import hintsA from './02-decode-and-verify/hints.md?raw';
import { checks as checksA } from './02-decode-and-verify/checks';
import concept2 from './03-lifecycle-expiry-refresh-revocation.md?raw';
import promptB from './04-refresh-rotation-and-jwks/prompt.md?raw';
import starterB from './04-refresh-rotation-and-jwks/starter.tsx?raw';
import solutionB from './04-refresh-rotation-and-jwks/solution.tsx?raw';
import hintsB from './04-refresh-rotation-and-jwks/hints.md?raw';
import { checks as checksB } from './04-refresh-rotation-and-jwks/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '71-jwt-in-depth',
  title: 'JWT in depth',
  track: 'auth',
  summary: 'Structure, signing, validation pitfalls, refresh rotation, and revocation.',
  steps: [
    { kind: 'concept', id: 'anatomy-and-verification', title: 'Anatomy and verification', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'decode-and-verify',
      title: 'Decode, verify, and validate a JWT',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'lifecycle-expiry-refresh-revocation',
      title: 'Lifecycle: expiry, refresh, revocation',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'refresh-rotation-and-jwks',
      title: 'Refresh rotation with reuse detection, and safe JWKS key selection',
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
