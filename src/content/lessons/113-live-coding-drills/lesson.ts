import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-how-a-screen-is-graded.md?raw';

import promptA from './02-drill-dependency-list/prompt.md?raw';
import dataA from './02-drill-dependency-list/data.ts?raw';
import starterA from './02-drill-dependency-list/starter.tsx?raw';
import solutionA from './02-drill-dependency-list/solution.tsx?raw';
import hintsA from './02-drill-dependency-list/hints.md?raw';
import { checks as checksA } from './02-drill-dependency-list/checks';

import promptB from './04-drill-task-table/prompt.md?raw';
import dataB from './04-drill-task-table/data.ts?raw';
import starterB from './04-drill-task-table/starter.tsx?raw';
import solutionB from './04-drill-task-table/solution.tsx?raw';
import hintsB from './04-drill-task-table/hints.md?raw';
import { checks as checksB } from './04-drill-task-table/checks';

import promptC from './06-drill-optimistic-status/prompt.md?raw';
import starterC from './06-drill-optimistic-status/starter.tsx?raw';
import solutionC from './06-drill-optimistic-status/solution.tsx?raw';
import hintsC from './06-drill-optimistic-status/hints.md?raw';
import { checks as checksC } from './06-drill-optimistic-status/checks';

import { quiz } from './07-quiz';

const lesson: Lesson = {
  id: '113-live-coding-drills',
  title: 'Live-coding drills for project UIs',
  track: 'interview',
  summary:
    'Timeboxed React exercises: dependency lists with cycle detection, large task tables, optimistic edits with rollback.',
  steps: [
    { kind: 'concept', id: 'how-a-screen-is-graded', title: 'How a React screen is graded', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'drill-dependency-list',
      title: 'Drill: dependency list with cycle detection',
      prompt: promptA,
      files: { 'App.tsx': starterA, 'data.ts': dataA },
      solution: { 'App.tsx': solutionA, 'data.ts': dataA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'exercise',
      id: 'drill-task-table',
      title: 'Drill: large task table',
      prompt: promptB,
      files: { 'App.tsx': starterB, 'data.ts': dataB },
      solution: { 'App.tsx': solutionB, 'data.ts': dataB },
      hints: splitHints(hintsB),
      checks: checksB,
    },
    {
      kind: 'exercise',
      id: 'drill-optimistic-status',
      title: 'Drill: optimistic status with rollback',
      prompt: promptC,
      files: { 'App.tsx': starterC },
      solution: { 'App.tsx': solutionC },
      hints: splitHints(hintsC),
      checks: checksC,
    },
    quiz,
  ],
};

export default lesson;
