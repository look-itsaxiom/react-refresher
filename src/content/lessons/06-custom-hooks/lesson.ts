import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-a-hook-is-a-function.md?raw';
import prompt1 from './02-use-resource/prompt.md?raw';
import starter1 from './02-use-resource/starter.tsx?raw';
import solution1 from './02-use-resource/solution.tsx?raw';
import hints1 from './02-use-resource/hints.md?raw';
import { checks as checks1 } from './02-use-resource/checks';
import concept2 from './03-stable-identities.md?raw';
import prompt2 from './04-use-debounced-search/prompt.md?raw';
import starter2 from './04-use-debounced-search/starter.tsx?raw';
import solution2 from './04-use-debounced-search/solution.tsx?raw';
import hints2 from './04-use-debounced-search/hints.md?raw';
import { checks as checks2 } from './04-use-debounced-search/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '06-custom-hooks',
  title: 'Custom hooks',
  track: 'refresher',
  summary: 'Extracting logic, stable identities, and the rules of hooks.',
  steps: [
    { kind: 'concept', id: 'a-hook-is-a-function', title: 'A hook is a function that calls hooks', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'use-resource',
      title: 'Extract a data-fetching hook',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    { kind: 'concept', id: 'stable-identities', title: 'Stable identities and hook design', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'use-debounced-search',
      title: 'Debounce a search box',
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
