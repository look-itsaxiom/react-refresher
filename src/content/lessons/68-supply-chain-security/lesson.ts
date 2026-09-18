import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-your-app-is-mostly-other-peoples-code.md?raw';
import promptA from './02-audit-a-lockfile/prompt.md?raw';
import starterA from './02-audit-a-lockfile/starter.tsx?raw';
import solutionA from './02-audit-a-lockfile/solution.tsx?raw';
import hintsA from './02-audit-a-lockfile/hints.md?raw';
import { checks as checksA } from './02-audit-a-lockfile/checks';
import concept2 from './03-controls-that-actually-help.md?raw';
import promptB from './04-review-a-dependency-diff/prompt.md?raw';
import starterB from './04-review-a-dependency-diff/starter.tsx?raw';
import solutionB from './04-review-a-dependency-diff/solution.tsx?raw';
import hintsB from './04-review-a-dependency-diff/hints.md?raw';
import { checks as checksB } from './04-review-a-dependency-diff/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '68-supply-chain-security',
  title: 'Supply chain security',
  track: 'security',
  summary: 'Lockfiles, provenance, install scripts, pnpm quarantine, and the 2025 RSC RCE as a case study.',
  steps: [
    { kind: 'concept', id: 'your-app-is-mostly-other-peoples-code', title: "Your app is mostly other people's code", markdown: concept1 },
    {
      kind: 'exercise',
      id: 'audit-a-lockfile',
      title: 'Audit a lockfile against a security policy',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'controls-that-actually-help', title: 'Controls that actually help', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'review-a-dependency-diff',
      title: 'Review a dependency diff and pin CI actions',
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
