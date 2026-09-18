import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-the-guiding-principle-operationalized.md?raw';
import prompt1 from './02-role-lite/prompt.md?raw';
import starter1 from './02-role-lite/starter.tsx?raw';
import solution1 from './02-role-lite/solution.tsx?raw';
import hints1 from './02-role-lite/hints.md?raw';
import { checks as checks1 } from './02-role-lite/checks';
import concept2 from './03-interaction-and-async-correctly.md?raw';
import prompt2 from './04-make-it-queryable/prompt.md?raw';
import starter2 from './04-make-it-queryable/starter.tsx?raw';
import solution2 from './04-make-it-queryable/solution.tsx?raw';
import hints2 from './04-make-it-queryable/hints.md?raw';
import { checks as checks2 } from './04-make-it-queryable/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '41-testing-library-philosophy',
  title: 'Testing Library, done right',
  track: 'testing',
  summary: 'Queries by role, user-event, async utilities, and avoiding implementation-detail tests.',
  steps: [
    {
      kind: 'concept',
      id: 'the-guiding-principle-operationalized',
      title: 'The guiding principle, operationalized',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'role-lite',
      title: 'Implement getByRoleLite',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    {
      kind: 'concept',
      id: 'interaction-and-async-correctly',
      title: 'Interaction and async, correctly',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'make-it-queryable',
      title: 'Make it queryable',
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
