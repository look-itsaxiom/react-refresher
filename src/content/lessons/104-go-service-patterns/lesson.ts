import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-shaping-a-service.md?raw';
import promptA from './02-worker-pool/prompt.md?raw';
import hintsA from './02-worker-pool/hints.md?raw';
import starterPoolA from '../../../../exercises-local/104-go-service-patterns/02-worker-pool/pool.go?raw';
import solutionPoolA from '../../../../exercises-local/104-go-service-patterns/02-worker-pool/pool_solution.go?raw';
import starterConfigA from '../../../../exercises-local/104-go-service-patterns/02-worker-pool/config.go?raw';
import solutionConfigA from '../../../../exercises-local/104-go-service-patterns/02-worker-pool/config_solution.go?raw';
import concept2 from './03-concurrency-in-production.md?raw';
import promptB from './04-graceful-shutdown/prompt.md?raw';
import hintsB from './04-graceful-shutdown/hints.md?raw';
import starterLifecycleB from '../../../../exercises-local/104-go-service-patterns/04-graceful-shutdown/lifecycle.go?raw';
import solutionLifecycleB from '../../../../exercises-local/104-go-service-patterns/04-graceful-shutdown/lifecycle_solution.go?raw';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '104-go-service-patterns',
  title: 'Go service patterns',
  track: 'go',
  summary:
    'Project layout, dependency injection, error wrapping, cancellation, worker pools, graceful shutdown, and slog.',
  steps: [
    { kind: 'concept', id: 'shaping-a-service', title: 'Shaping a service', markdown: concept1 },
    {
      kind: 'exercise',
      id: '02-worker-pool',
      title: 'A bounded worker pool and validated config',
      prompt: promptA,
      runtime: 'local',
      local: {
        dir: '104-go-service-patterns/02-worker-pool',
        command: 'go test ./...',
        expectedTests: [
          'TestRunPreservesOrder',
          'TestRunConcurrencyMatchesWorkers',
          'TestRunCancellationReturnsPartialResultsWithoutLeak',
          'TestRunPerJobErrorsDoNotStopPool',
          'TestLoadConfigDefaultsAndOverrides',
          'TestLoadConfigValidationErrorsJoinSentinel',
        ],
      },
      files: { 'pool.go': starterPoolA, 'config.go': starterConfigA },
      solution: { 'pool.go': solutionPoolA, 'config.go': solutionConfigA },
      hints: splitHints(hintsA),
      checks: [],
    },
    { kind: 'concept', id: 'concurrency-in-production', title: 'Concurrency in production', markdown: concept2 },
    {
      kind: 'exercise',
      id: '04-graceful-shutdown',
      title: 'Drain in-flight requests on shutdown',
      prompt: promptB,
      runtime: 'local',
      local: {
        dir: '104-go-service-patterns/04-graceful-shutdown',
        command: 'go test ./...',
        expectedTests: [
          'TestRunDrainsSlowInFlightRequest',
          'TestReadinessFlipsDuringShutdown',
          'TestRunLogsStartingAndStoppedWithAttrs',
          'TestRunNeverReturnsErrServerClosed',
        ],
      },
      files: { 'lifecycle.go': starterLifecycleB },
      solution: { 'lifecycle.go': solutionLifecycleB },
      hints: splitHints(hintsB),
      checks: [],
    },
    quiz,
  ],
};

export default lesson;
