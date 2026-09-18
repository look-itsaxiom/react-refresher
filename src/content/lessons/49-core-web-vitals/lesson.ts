import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-the-metrics-defined-precisely.md?raw';
import promptA from './02-summarize-and-classify/prompt.md?raw';
import starterA from './02-summarize-and-classify/starter.tsx?raw';
import solutionA from './02-summarize-and-classify/solution.tsx?raw';
import hintsA from './02-summarize-and-classify/hints.md?raw';
import { checks as checksA } from './02-summarize-and-classify/checks';
import concept2 from './03-measuring-in-practice.md?raw';
import promptB from './04-cls-and-lcp-from-raw-entries/prompt.md?raw';
import starterB from './04-cls-and-lcp-from-raw-entries/starter.tsx?raw';
import solutionB from './04-cls-and-lcp-from-raw-entries/solution.tsx?raw';
import hintsB from './04-cls-and-lcp-from-raw-entries/hints.md?raw';
import { checks as checksB } from './04-cls-and-lcp-from-raw-entries/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '49-core-web-vitals',
  title: 'Core Web Vitals and measurement',
  track: 'performance',
  summary: 'LCP, INP, CLS; Lighthouse, DevTools, RUM, and the web-vitals library.',
  steps: [
    { kind: 'concept', id: 'the-metrics-defined-precisely', title: 'The metrics, defined precisely', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'summarize-and-classify',
      title: 'Summarize field data and compute INP',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'measuring-in-practice', title: 'Measuring in practice', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'cls-and-lcp-from-raw-entries',
      title: 'Implement CLS sessions and LCP candidate resolution',
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
