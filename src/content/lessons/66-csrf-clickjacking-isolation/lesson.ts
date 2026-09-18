import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-csrf-in-2026.md?raw';
import promptA from './02-cookie-and-csrf-risk/prompt.md?raw';
import starterA from './02-cookie-and-csrf-risk/starter.tsx?raw';
import solutionA from './02-cookie-and-csrf-risk/solution.tsx?raw';
import hintsA from './02-cookie-and-csrf-risk/hints.md?raw';
import { checks as checksA } from './02-cookie-and-csrf-risk/checks';
import concept2 from './03-framing-windows-isolation.md?raw';
import promptB from './04-isolation-audit/prompt.md?raw';
import starterB from './04-isolation-audit/starter.tsx?raw';
import solutionB from './04-isolation-audit/solution.tsx?raw';
import hintsB from './04-isolation-audit/hints.md?raw';
import { checks as checksB } from './04-isolation-audit/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '66-csrf-clickjacking-isolation',
  title: 'CSRF, clickjacking, and isolation',
  track: 'security',
  summary: 'SameSite cookies, CSRF tokens, frame-ancestors, COOP and COEP.',
  steps: [
    { kind: 'concept', id: 'csrf-in-2026', title: 'CSRF in 2026: mostly dead, still dangerous', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'cookie-and-csrf-risk',
      title: 'Decide whether the cookie gets sent, and whether the endpoint is exposed',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'framing-windows-isolation', title: 'Framing, windows, and isolation', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'isolation-audit',
      title: "Audit a page's framing and isolation headers",
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
