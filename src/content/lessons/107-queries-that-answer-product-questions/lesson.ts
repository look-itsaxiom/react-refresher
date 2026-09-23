import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-ask-the-question-in-sql.md?raw';
import seedA from './02-status-and-workload/seed.sql?raw';
import promptA from './02-status-and-workload/prompt.md?raw';
import starterA from './02-status-and-workload/starter.sql?raw';
import solutionA from './02-status-and-workload/solution.sql?raw';
import hintsA from './02-status-and-workload/hints.md?raw';
import { checks as checksA } from './02-status-and-workload/checks';
import concept2 from './03-graphs-and-documents.md?raw';
import seedB from './04-dependencies-and-documents/seed.sql?raw';
import promptB from './04-dependencies-and-documents/prompt.md?raw';
import starterB from './04-dependencies-and-documents/starter.sql?raw';
import solutionB from './04-dependencies-and-documents/solution.sql?raw';
import hintsB from './04-dependencies-and-documents/hints.md?raw';
import { checks as checksB } from './04-dependencies-and-documents/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '107-queries-that-answer-product-questions',
  title: 'Queries that answer product questions',
  track: 'postgres',
  summary: 'Joins, CTEs, window functions, recursive CTEs for hierarchies and dependency graphs, LATERAL, and jsonb.',
  steps: [
    {
      kind: 'concept',
      id: 'ask-the-question-in-sql',
      title: 'Ask the question in SQL',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'status-and-workload',
      title: 'Status, workload, and progress views',
      prompt: promptA,
      runtime: 'sql',
      files: { 'seed.sql': seedA, 'query.sql': starterA },
      solution: { 'seed.sql': seedA, 'query.sql': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'graphs-and-documents',
      title: 'Graphs and documents',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'dependencies-and-documents',
      title: 'Dependency graphs, hierarchies, and jsonb',
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
