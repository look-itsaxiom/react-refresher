import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-a-pipeline-that-is-fast-and-honest.md?raw';
import promptA from './02-workflow-generator/prompt.md?raw';
import starterA from './02-workflow-generator/starter.tsx?raw';
import solutionA from './02-workflow-generator/solution.tsx?raw';
import hintsA from './02-workflow-generator/hints.md?raw';
import { checks as checksA } from './02-workflow-generator/checks';
import concept2 from './03-deploys-gates-and-not-getting-owned.md?raw';
import promptB from './04-workflow-linter/prompt.md?raw';
import starterB from './04-workflow-linter/starter.tsx?raw';
import solutionB from './04-workflow-linter/solution.tsx?raw';
import hintsB from './04-workflow-linter/hints.md?raw';
import { checks as checksB } from './04-workflow-linter/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '92-ci-cd-with-github-actions',
  title: 'CI/CD with GitHub Actions',
  track: 'deployment',
  summary: 'Test, typecheck, build, cache, preview deploys, and required checks.',
  steps: [
    { kind: 'concept', id: 'a-pipeline-that-is-fast-and-honest', title: 'A frontend CI pipeline that is fast and honest', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'workflow-generator',
      title: 'Generate a frontend CI workflow',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'deploys-gates-and-not-getting-owned', title: 'Deploys, gates, and not getting owned', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'workflow-linter',
      title: 'Lint a workflow for dangerous patterns',
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
