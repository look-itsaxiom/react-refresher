import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-what-hydration-is-and-how-it-fails.md?raw';
import prompt1 from './02-fix-the-mismatches/prompt.md?raw';
import starter1 from './02-fix-the-mismatches/starter.tsx?raw';
import solution1 from './02-fix-the-mismatches/solution.tsx?raw';
import hints1 from './02-fix-the-mismatches/hints.md?raw';
import { checks as checks1 } from './02-fix-the-mismatches/checks';
import concept2 from './03-selective-and-incremental-hydration.md?raw';
import prompt2 from './04-plan-selective-hydration/prompt.md?raw';
import starter2 from './04-plan-selective-hydration/starter.tsx?raw';
import solution2 from './04-plan-selective-hydration/solution.tsx?raw';
import hints2 from './04-plan-selective-hydration/hints.md?raw';
import { checks as checks2 } from './04-plan-selective-hydration/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '45-hydration',
  title: 'Hydration and its failure modes',
  track: 'rendering',
  summary: 'Mismatches, selective and progressive hydration, islands, and partial prerendering.',
  steps: [
    { kind: 'concept', id: 'what-hydration-is-and-how-it-fails', title: 'What hydration is, and how it fails', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'fix-the-mismatches',
      title: 'Fix the mismatches',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    { kind: 'concept', id: 'selective-and-incremental-hydration', title: 'Making hydration cheap and incremental', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'plan-selective-hydration',
      title: 'Plan selective hydration',
      prompt: prompt2,
      files: { 'App.tsx': starter2 },
      solution: { 'App.tsx': solution2 },
      hints: splitHints(hints2),
      checks: checks2,
    },
    quiz,
  ],
};

export default lesson;
