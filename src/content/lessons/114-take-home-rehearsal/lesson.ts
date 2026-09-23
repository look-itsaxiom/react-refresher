import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-how-take-homes-are-graded.md?raw';
import promptA from './02-finish-the-api/prompt.md?raw';
import hintsA from './02-finish-the-api/hints.md?raw';
import serverStarter from '../../../../exercises-local/114-take-home-rehearsal/02-finish-the-api/server.go?raw';
import serverSolution from '../../../../exercises-local/114-take-home-rehearsal/02-finish-the-api/server_solution.go?raw';
import storeGo from '../../../../exercises-local/114-take-home-rehearsal/02-finish-the-api/store.go?raw';
import migration from '../../../../exercises-local/114-take-home-rehearsal/02-finish-the-api/migrations/0001_init.sql?raw';
import dockerCompose from '../../../../exercises-local/114-take-home-rehearsal/02-finish-the-api/docker-compose.yml?raw';
import ciWorkflow from '../../../../exercises-local/114-take-home-rehearsal/02-finish-the-api/github-workflows/ci.yml?raw';
import concept2 from './03-the-template-piece-by-piece.md?raw';
import promptB from './04-review-your-submission/prompt.md?raw';
import hintsB from './04-review-your-submission/hints.md?raw';
import starterB from './04-review-your-submission/starter.tsx?raw';
import solutionB from './04-review-your-submission/solution.tsx?raw';
import { checks as checksB } from './04-review-your-submission/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '114-take-home-rehearsal',
  title: 'Take-home rehearsal',
  track: 'interview',
  summary: 'A Go API, Postgres schema, React UI, and GitHub Actions workflow template, with a reviewer checklist.',
  steps: [
    { kind: 'concept', id: 'how-take-homes-are-graded', title: 'How take-homes are actually graded', markdown: concept1 },
    {
      kind: 'exercise',
      id: '02-finish-the-api',
      title: 'Finish the API',
      prompt: promptA,
      runtime: 'local',
      local: {
        dir: '114-take-home-rehearsal/02-finish-the-api',
        command: 'go test ./...',
        expectedTests: [
          'TestListAndCreateTasks',
          'TestAddDependencySuccess',
          'TestAddDependencyRejectsCycle',
          'TestAddDependencyUnknownTask',
          'TestReadyTasks',
        ],
      },
      files: {
        'store.go': storeGo,
        'server.go': serverStarter,
        'migrations/0001_init.sql': migration,
        'docker-compose.yml': dockerCompose,
        'github-workflows/ci.yml': ciWorkflow,
      },
      solution: {
        'store.go': storeGo,
        'server_solution.go': serverSolution,
        'migrations/0001_init.sql': migration,
        'docker-compose.yml': dockerCompose,
        'github-workflows/ci.yml': ciWorkflow,
      },
      hints: splitHints(hintsA),
      checks: [],
    },
    { kind: 'concept', id: 'the-template-piece-by-piece', title: 'The template, piece by piece', markdown: concept2 },
    {
      kind: 'exercise',
      id: '04-review-your-submission',
      title: 'Review your submission',
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
