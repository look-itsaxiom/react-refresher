import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-gqlgen-schema-first.md?raw';
import promptA from './02-resolvers-and-dataloader/prompt.md?raw';
import hintsA from './02-resolvers-and-dataloader/hints.md?raw';
import starterA from '../../../../exercises-local/110-graphql-servers-in-go/02-resolvers-and-dataloader/resolvers.go?raw';
import solutionA from '../../../../exercises-local/110-graphql-servers-in-go/02-resolvers-and-dataloader/resolvers_solution.go?raw';
import concept2 from './03-resolvers-under-load.md?raw';
import promptB from './04-cost-and-context/prompt.md?raw';
import hintsB from './04-cost-and-context/hints.md?raw';
import starterB from '../../../../exercises-local/110-graphql-servers-in-go/04-cost-and-context/graphcost.go?raw';
import solutionB from '../../../../exercises-local/110-graphql-servers-in-go/04-cost-and-context/graphcost_solution.go?raw';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '110-graphql-servers-in-go',
  title: 'GraphQL servers in Go',
  track: 'graphql',
  summary: 'gqlgen schema-first workflow, resolvers, dataloaders for n+1, complexity limits, and auth in context.',
  steps: [
    { kind: 'concept', id: 'gqlgen-schema-first', title: 'gqlgen: schema first, code generated', markdown: concept1 },
    {
      kind: 'exercise',
      id: '02-resolvers-and-dataloader',
      title: 'Resolvers and a dataloader',
      prompt: promptA,
      runtime: 'local',
      local: {
        dir: '110-graphql-servers-in-go/02-resolvers-and-dataloader',
        command: 'go test ./...',
        expectedTests: [
          'TestResolveProjectsBatchesStoreCalls',
          'TestResolveProjectsStableOrder',
          'TestResolveProjectsMissingAssignee',
          'TestLoaderDedupesConcurrentSameKey',
          'TestLoaderCachesAfterFirstLoad',
          'TestLoaderConcurrentKeysBounded',
        ],
      },
      files: { 'resolvers.go': starterA },
      solution: { 'resolvers.go': solutionA },
      hints: splitHints(hintsA),
      checks: [],
    },
    { kind: 'concept', id: 'resolvers-under-load', title: 'Resolvers under load: N+1, cost, and auth', markdown: concept2 },
    {
      kind: 'exercise',
      id: '04-cost-and-context',
      title: 'Fix the cost limiter and auth middleware',
      prompt: promptB,
      runtime: 'local',
      local: {
        dir: '110-graphql-servers-in-go/04-cost-and-context',
        command: 'go test ./...',
        expectedTests: [
          'TestParseSelectionNested',
          'TestParseSelectionError',
          'TestCostWorkedExample',
          'TestDepthWorkedExample',
          'TestEnforce',
          'TestPrincipalRoundTrip',
          'TestRequireRole',
          'TestAuthenticateMiddleware',
        ],
      },
      files: { 'graphcost.go': starterB },
      solution: { 'graphcost.go': solutionB },
      hints: splitHints(hintsB),
      checks: [],
    },
    quiz,
  ],
};

export default lesson;
