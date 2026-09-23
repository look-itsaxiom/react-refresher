import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-go-read-through-typescript-eyes.md?raw';
import promptA from './02-task-parsing/prompt.md?raw';
import hintsA from './02-task-parsing/hints.md?raw';
import starterA from '../../../../exercises-local/102-go-for-typescript-developers/02-task-parsing/tasks.go?raw';
import solutionA from '../../../../exercises-local/102-go-for-typescript-developers/02-task-parsing/tasks_solution.go?raw';
import concept2 from './03-concurrency-and-the-toolchain.md?raw';
import promptB from './04-concurrent-fetch/prompt.md?raw';
import hintsB from './04-concurrent-fetch/hints.md?raw';
import starterB from '../../../../exercises-local/102-go-for-typescript-developers/04-concurrent-fetch/fetchall.go?raw';
import solutionB from '../../../../exercises-local/102-go-for-typescript-developers/04-concurrent-fetch/fetchall_solution.go?raw';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '102-go-for-typescript-developers',
  title: 'Go for TypeScript developers',
  track: 'go',
  summary: 'Syntax and types, structs and interfaces, errors as values, slices and maps, goroutines, and the go tool.',
  steps: [
    { kind: 'concept', id: 'go-read-through-typescript-eyes', title: 'Go, read through TypeScript eyes', markdown: concept1 },
    {
      kind: 'exercise',
      id: '02-task-parsing',
      title: 'Parse a task list',
      prompt: promptA,
      runtime: 'local',
      local: {
        dir: '102-go-for-typescript-developers/02-task-parsing',
        command: 'go test ./...',
        expectedTests: ['TestParseTaskLine', 'TestParseTasks', 'TestTotalEstimate', 'TestGroupByStatus', 'TestGroupByStatusAliasing'],
      },
      files: { 'tasks.go': starterA },
      solution: { 'tasks.go': solutionA },
      hints: splitHints(hintsA),
      checks: [],
    },
    { kind: 'concept', id: 'concurrency-and-the-toolchain', title: 'Concurrency and the toolchain', markdown: concept2 },
    {
      kind: 'exercise',
      id: '04-concurrent-fetch',
      title: 'Fetch concurrently, with a cap',
      prompt: promptB,
      runtime: 'local',
      local: {
        dir: '102-go-for-typescript-developers/04-concurrent-fetch',
        command: 'go test ./...',
        expectedTests: ['TestFetchAllOrder', 'TestFetchAllConcurrency', 'TestFetchAllRespectsMaxConcurrent', 'TestFetchAllFirstError', 'TestCounter'],
      },
      files: { 'fetchall.go': starterB },
      solution: { 'fetchall.go': solutionB },
      hints: splitHints(hintsB),
      checks: [],
    },
    quiz,
  ],
};

export default lesson;
