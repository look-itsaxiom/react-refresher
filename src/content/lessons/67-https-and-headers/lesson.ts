import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-https-everywhere-actually.md?raw';
import promptA from './02-header-and-mixed-content-audit/prompt.md?raw';
import starterA from './02-header-and-mixed-content-audit/starter.tsx?raw';
import solutionA from './02-header-and-mixed-content-audit/solution.tsx?raw';
import hintsA from './02-header-and-mixed-content-audit/hints.md?raw';
import { checks as checksA } from './02-header-and-mixed-content-audit/checks';
import concept2 from './03-headers-that-are-yours-to-set.md?raw';
import promptB from './04-subresource-integrity/prompt.md?raw';
import starterB from './04-subresource-integrity/starter.tsx?raw';
import solutionB from './04-subresource-integrity/solution.tsx?raw';
import hintsB from './04-subresource-integrity/hints.md?raw';
import { checks as checksB } from './04-subresource-integrity/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '67-https-and-headers',
  title: 'HTTPS and security headers',
  track: 'security',
  summary: 'TLS basics, HSTS, mixed content, Subresource Integrity, Permissions-Policy.',
  steps: [
    { kind: 'concept', id: 'https-everywhere-actually', title: 'HTTPS everywhere, actually', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'header-and-mixed-content-audit',
      title: 'Audit the headers and the mixed content',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'headers-that-are-yours-to-set', title: 'The headers that are yours to set', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'subresource-integrity',
      title: 'Compute and verify Subresource Integrity',
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
