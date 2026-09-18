import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-config-flags-and-progressive-delivery.md?raw';
import promptA from './02-build-a-flag-client/prompt.md?raw';
import starterA from './02-build-a-flag-client/starter.tsx?raw';
import solutionA from './02-build-a-flag-client/solution.tsx?raw';
import hintsA from './02-build-a-flag-client/hints.md?raw';
import { checks as checksA } from './02-build-a-flag-client/checks';
import concept2 from './03-knowing-it-broke-before-users-tell-you.md?raw';
import promptB from './04-build-a-monitoring-client/prompt.md?raw';
import starterB from './04-build-a-monitoring-client/starter.tsx?raw';
import solutionB from './04-build-a-monitoring-client/solution.tsx?raw';
import hintsB from './04-build-a-monitoring-client/hints.md?raw';
import { checks as checksB } from './04-build-a-monitoring-client/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '93-release-safety',
  title: 'Release safety and observability',
  track: 'deployment',
  summary: 'Environment config, feature flags, canaries and rollbacks, Sentry, and RUM.',
  steps: [
    {
      kind: 'concept',
      id: 'config-flags-and-progressive-delivery',
      title: 'Config, flags, and progressive delivery',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'build-a-flag-client',
      title: 'Build a feature-flag client',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'knowing-it-broke-before-users-tell-you',
      title: 'Knowing it broke before users tell you',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'build-a-monitoring-client',
      title: 'Build a mini error-monitoring client',
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
