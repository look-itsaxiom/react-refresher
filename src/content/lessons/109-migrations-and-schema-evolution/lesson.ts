import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-migrations-as-code.md?raw';
import promptA from './02-expand-contract-rename/prompt.md?raw';
import starterA from './02-expand-contract-rename/starter.sql?raw';
import solutionA from './02-expand-contract-rename/solution.sql?raw';
import seedA from './02-expand-contract-rename/seed.sql?raw';
import hintsA from './02-expand-contract-rename/hints.md?raw';
import { checks as checksA } from './02-expand-contract-rename/checks';
import concept2 from './03-changing-a-live-table-without-an-outage.md?raw';
import promptB from './04-safe-migration-review/prompt.md?raw';
import starterB from './04-safe-migration-review/starter.sql?raw';
import solutionB from './04-safe-migration-review/solution.sql?raw';
import seedB from './04-safe-migration-review/seed.sql?raw';
import hintsB from './04-safe-migration-review/hints.md?raw';
import { checks as checksB } from './04-safe-migration-review/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '109-migrations-and-schema-evolution',
  title: 'Migrations and schema evolution',
  track: 'postgres',
  summary: 'Expand/contract, zero-downtime changes, batched backfills, locks and CONCURRENTLY, and migration tools.',
  steps: [
    {
      kind: 'concept',
      id: 'migrations-as-code',
      title: 'Migrations as code',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'expand-contract-rename',
      title: 'Expand a live table, don’t rewrite it',
      prompt: promptA,
      runtime: 'sql',
      files: { 'seed.sql': seedA, 'query.sql': starterA },
      solution: { 'seed.sql': seedA, 'query.sql': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'changing-a-live-table-without-an-outage',
      title: 'Changing a live table without an outage',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'safe-migration-review',
      title: 'Review a migration batch before it ships',
      prompt: promptB,
      runtime: 'sql',
      files: { 'seed.sql': seedB, 'query.sql': starterB },
      solution: { 'seed.sql': seedB, 'query.sql': solutionB },
      hints: splitHints(hintsB),
      checks: checksB,
    },
    quiz,
  ],
};

export default lesson;
