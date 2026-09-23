import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-modeling-the-domain.md?raw';
import promptA from './02-write-the-schema/prompt.md?raw';
import starterA from './02-write-the-schema/starter.sql?raw';
import solutionA from './02-write-the-schema/solution.sql?raw';
import hintsA from './02-write-the-schema/hints.md?raw';
import { checks as checksA } from './02-write-the-schema/checks';
import concept2 from './03-constraints-are-the-api.md?raw';
import promptB from './04-sharing-and-visibility/prompt.md?raw';
import seedB from './04-sharing-and-visibility/seed.sql?raw';
import starterB from './04-sharing-and-visibility/starter.sql?raw';
import solutionB from './04-sharing-and-visibility/solution.sql?raw';
import hintsB from './04-sharing-and-visibility/hints.md?raw';
import { checks as checksB } from './04-sharing-and-visibility/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '106-schema-design-for-project-data',
  title: 'Schema design for cross-organization project data',
  track: 'postgres',
  summary:
    'Organizations, projects, tasks, dependencies, and sharing across companies; constraints, enums, soft deletes, audit columns.',
  steps: [
    { kind: 'concept', id: 'modeling-the-domain', title: 'Modeling the domain, not the UI', markdown: concept1 },
    {
      kind: 'exercise',
      id: '02-write-the-schema',
      title: 'Write the schema',
      prompt: promptA,
      runtime: 'sql',
      files: { 'query.sql': starterA },
      solution: { 'query.sql': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'constraints-are-the-api', title: 'Constraints are the API', markdown: concept2 },
    {
      kind: 'exercise',
      id: '04-sharing-and-visibility',
      title: 'Sharing and visibility',
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
