import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-how-postgres-decides.md?raw';
import prompt1 from './02-make-these-queries-fast/prompt.md?raw';
import starter1 from './02-make-these-queries-fast/starter.sql?raw';
import solution1 from './02-make-these-queries-fast/solution.sql?raw';
import seed1 from './02-make-these-queries-fast/seed.sql?raw';
import hints1 from './02-make-these-queries-fast/hints.md?raw';
import { checks as checks1 } from './02-make-these-queries-fast/checks';
import concept2 from './03-choosing-indexes.md?raw';
import prompt2 from './04-read-the-plan/prompt.md?raw';
import starter2 from './04-read-the-plan/starter.sql?raw';
import solution2 from './04-read-the-plan/solution.sql?raw';
import seed2 from './04-read-the-plan/seed.sql?raw';
import hints2 from './04-read-the-plan/hints.md?raw';
import { checks as checks2 } from './04-read-the-plan/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '108-indexes-and-explain',
  title: 'Indexes and EXPLAIN',
  track: 'postgres',
  summary: 'Btree, composite, partial, covering, and GIN indexes; reading plans; the database side of n+1.',
  steps: [
    { kind: 'concept', id: 'how-postgres-decides', title: 'How Postgres decides', markdown: concept1 },
    {
      kind: 'exercise',
      id: '02-make-these-queries-fast',
      title: 'Make these queries fast',
      prompt: prompt1,
      runtime: 'sql',
      files: { 'seed.sql': seed1, 'query.sql': starter1 },
      solution: { 'seed.sql': seed1, 'query.sql': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    { kind: 'concept', id: 'choosing-indexes', title: 'Choosing indexes', markdown: concept2 },
    {
      kind: 'exercise',
      id: '04-read-the-plan',
      title: 'Read the plan',
      prompt: prompt2,
      runtime: 'sql',
      files: { 'seed.sql': seed2, 'query.sql': starter2 },
      solution: { 'seed.sql': seed2, 'query.sql': solution2 },
      hints: splitHints(hints2),
      checks: checks2,
    },
    quiz,
  ],
};

export default lesson;
