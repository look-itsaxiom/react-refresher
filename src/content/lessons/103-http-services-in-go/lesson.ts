import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-a-server-is-a-function.md?raw';
import promptA from './02-tasks-api/prompt.md?raw';
import hintsA from './02-tasks-api/hints.md?raw';
import starterA from '../../../../exercises-local/103-http-services-in-go/02-tasks-api/tasksapi.go?raw';
import solutionA from '../../../../exercises-local/103-http-services-in-go/02-tasks-api/tasksapi_solution.go?raw';
import concept2 from './03-middleware-and-structure.md?raw';
import promptB from './04-middleware-chain/prompt.md?raw';
import hintsB from './04-middleware-chain/hints.md?raw';
import starterB from '../../../../exercises-local/103-http-services-in-go/04-middleware-chain/middleware.go?raw';
import solutionB from '../../../../exercises-local/103-http-services-in-go/04-middleware-chain/middleware_solution.go?raw';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '103-http-services-in-go',
  title: 'HTTP services in Go',
  track: 'go',
  summary: 'net/http routing patterns, handlers, middleware chains, context, JSON, error responses, and httptest.',
  steps: [
    { kind: 'concept', id: 'a-server-is-a-function', title: 'A server is a function', markdown: concept1 },
    {
      kind: 'exercise',
      id: '02-tasks-api',
      title: 'Build the tasks API',
      prompt: promptA,
      runtime: 'local',
      local: {
        dir: '103-http-services-in-go/02-tasks-api',
        command: 'go test ./...',
        expectedTests: [
          'TestListTasks',
          'TestCreateTask',
          'TestCreateTaskValidation',
          'TestGetTask',
          'TestUpdateTaskStatus',
          'TestMethodNotAllowed',
        ],
      },
      files: { 'tasksapi.go': starterA },
      solution: { 'tasksapi.go': solutionA },
      hints: splitHints(hintsA),
      checks: [],
    },
    { kind: 'concept', id: 'middleware-and-structure', title: 'Middleware and structure', markdown: concept2 },
    {
      kind: 'exercise',
      id: '04-middleware-chain',
      title: 'Fix the middleware chain',
      prompt: promptB,
      runtime: 'local',
      local: {
        dir: '103-http-services-in-go/04-middleware-chain',
        command: 'go test ./...',
        expectedTests: [
          'TestChainOrdering',
          'TestRequestIDPropagation',
          'TestTimeoutMiddleware',
          'TestLoggerFields',
          'TestRecoverFromPanic',
        ],
      },
      files: { 'middleware.go': starterB },
      solution: { 'middleware.go': solutionB },
      hints: splitHints(hintsB),
      checks: [],
    },
    quiz,
  ],
};

export default lesson;
