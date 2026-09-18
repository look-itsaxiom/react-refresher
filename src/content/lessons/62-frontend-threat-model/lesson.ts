import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-browser-security-model.md?raw';
import promptA from './02-taint-flows/prompt.md?raw';
import starterA from './02-taint-flows/starter.tsx?raw';
import solutionA from './02-taint-flows/solution.tsx?raw';
import hintsA from './02-taint-flows/hints.md?raw';
import { checks as checksA } from './02-taint-flows/checks';
import concept2 from './03-owasp-frontend-map.md?raw';
import promptB from './04-threat-model/prompt.md?raw';
import starterB from './04-threat-model/starter.tsx?raw';
import solutionB from './04-threat-model/solution.tsx?raw';
import hintsB from './04-threat-model/hints.md?raw';
import { checks as checksB } from './04-threat-model/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '62-frontend-threat-model',
  title: 'A frontend threat model',
  track: 'security',
  summary: 'OWASP Top 10 through a frontend lens and what the browser does and does not protect.',
  steps: [
    { kind: 'concept', id: 'browser-security-model', title: 'What the browser protects, and what it does not', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'taint-flows',
      title: 'Trace unsanitized data flows',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'owasp-frontend-map', title: 'Mapping OWASP to the frontend', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'threat-model',
      title: 'Build a STRIDE-lite threat model',
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
