import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-web-push-end-to-end.md?raw';
import promptA from './02-push-opt-in/prompt.md?raw';
import starterA from './02-push-opt-in/starter.tsx?raw';
import solutionA from './02-push-opt-in/solution.tsx?raw';
import hintsA from './02-push-opt-in/hints.md?raw';
import { checks as checksA } from './02-push-opt-in/checks';
import concept2 from './03-the-rest-of-the-platform.md?raw';
import promptB from './04-capability-tiers/prompt.md?raw';
import starterB from './04-capability-tiers/starter.tsx?raw';
import solutionB from './04-capability-tiers/solution.tsx?raw';
import hintsB from './04-capability-tiers/hints.md?raw';
import { checks as checksB } from './04-capability-tiers/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '86-push-and-platform-capabilities',
  title: 'Push and platform capabilities',
  track: 'pwa',
  summary: 'Web Push, badging, share target, file handling, and permissions UX.',
  steps: [
    { kind: 'concept', id: 'web-push-end-to-end', title: 'Web Push end to end', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'push-opt-in',
      title: 'Build a push opt-in flow',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'the-rest-of-the-platform', title: 'The rest of the platform', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'capability-tiers',
      title: 'Feature-detect the platform',
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
