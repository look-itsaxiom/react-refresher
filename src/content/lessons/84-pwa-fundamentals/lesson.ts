import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-what-makes-a-web-app-installable.md?raw';
import promptA from './02-validate-and-resolve/prompt.md?raw';
import starterA from './02-validate-and-resolve/starter.tsx?raw';
import solutionA from './02-validate-and-resolve/solution.tsx?raw';
import hintsA from './02-validate-and-resolve/hints.md?raw';
import { checks as checksA } from './02-validate-and-resolve/checks';
import concept2 from './03-feeling-like-an-app.md?raw';
import promptB from './04-install-banner/prompt.md?raw';
import starterB from './04-install-banner/starter.tsx?raw';
import solutionB from './04-install-banner/solution.tsx?raw';
import hintsB from './04-install-banner/hints.md?raw';
import { checks as checksB } from './04-install-banner/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '84-pwa-fundamentals',
  title: 'PWA fundamentals',
  track: 'pwa',
  summary: 'Manifests, installability, display modes, and the app-like UX checklist.',
  steps: [
    {
      kind: 'concept',
      id: 'what-makes-a-web-app-installable',
      title: 'What makes a web app installable',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'validate-and-resolve',
      title: 'Validate a manifest and resolve its display mode',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'feeling-like-an-app', title: 'Feeling like an app', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'install-banner',
      title: 'Build a custom install banner',
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
