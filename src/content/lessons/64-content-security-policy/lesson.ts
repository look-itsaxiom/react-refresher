import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-what-csp-does.md?raw';
import promptA from './02-parse-and-allow/prompt.md?raw';
import starterA from './02-parse-and-allow/starter.tsx?raw';
import solutionA from './02-parse-and-allow/solution.tsx?raw';
import hintsA from './02-parse-and-allow/hints.md?raw';
import { checks as checksA } from './02-parse-and-allow/checks';
import concept2 from './03-deploying-csp.md?raw';
import promptB from './04-build-and-summarize/prompt.md?raw';
import starterB from './04-build-and-summarize/starter.tsx?raw';
import solutionB from './04-build-and-summarize/solution.tsx?raw';
import hintsB from './04-build-and-summarize/hints.md?raw';
import { checks as checksB } from './04-build-and-summarize/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '64-content-security-policy',
  title: 'Content Security Policy',
  track: 'security',
  summary: 'Directives, nonces and hashes, strict-dynamic, reporting, and CSP with Vite and Next.js.',
  steps: [
    { kind: 'concept', id: 'what-csp-does', title: 'What CSP does and how policies are evaluated', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'parse-and-allow',
      title: 'Parse a CSP header and decide what it allows',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'deploying-csp', title: 'Deploying CSP without breaking production', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'build-and-summarize',
      title: 'Build a strict policy, then triage its violation reports',
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
