import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-how-react-renders.md?raw';
import prompt from './02-fix-the-counter/prompt.md?raw';
import starter from './02-fix-the-counter/starter.tsx?raw';
import solution from './02-fix-the-counter/solution.tsx?raw';
import hints from './02-fix-the-counter/hints.md?raw';
import { checks } from './02-fix-the-counter/checks';
import concept2 from './03-derived-state-and-keys.md?raw';
import { quiz } from './04-quiz';

const lesson: Lesson = {
  id: '01-rendering-and-state',
  title: 'Rendering and state',
  track: 'refresher',
  summary: 'Trigger, render, commit. State as a snapshot. Batching and updater functions.',
  steps: [
    { kind: 'concept', id: 'how-react-renders', title: 'How React renders', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'fix-the-counter',
      title: 'Fix the stale counter',
      prompt,
      files: { 'App.tsx': starter },
      solution: { 'App.tsx': solution },
      hints: splitHints(hints),
      checks,
    },
    { kind: 'concept', id: 'derived-state-and-keys', title: 'Derived state and keys', markdown: concept2 },
    quiz,
  ],
};

export default lesson;
