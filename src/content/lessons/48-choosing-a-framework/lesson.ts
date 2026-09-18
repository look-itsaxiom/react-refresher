import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-the-axes.md?raw';
import promptA from './02-score-frameworks/prompt.md?raw';
import starterA from './02-score-frameworks/starter.tsx?raw';
import solutionA from './02-score-frameworks/solution.tsx?raw';
import hintsA from './02-score-frameworks/hints.md?raw';
import { checks as checksA } from './02-score-frameworks/checks';
import concept2 from './03-deciding-migrating-hedging.md?raw';
import promptB from './04-plan-migration/prompt.md?raw';
import starterB from './04-plan-migration/starter.tsx?raw';
import solutionB from './04-plan-migration/solution.tsx?raw';
import hintsB from './04-plan-migration/hints.md?raw';
import { checks as checksB } from './04-plan-migration/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '48-choosing-a-framework',
  track: 'rendering',
  title: 'Choosing a meta-framework',
  summary: 'Next.js, React Router, TanStack Start, Astro, SvelteKit, Nuxt: a decision framework.',
  steps: [
    { kind: 'concept', id: 'the-axes', title: "What you're actually choosing", markdown: concept1 },
    {
      kind: 'exercise',
      id: 'score-frameworks',
      title: 'Build a framework scorer',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'deciding-migrating-hedging', title: 'Deciding, migrating, and hedging', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'plan-migration',
      title: 'Build a migration planner',
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
