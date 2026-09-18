import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-ai-for-tests-a11y-and-refactors.md?raw';
import analyzePrompt from './02-analyze-test-file/prompt.md?raw';
import analyzeStarter from './02-analyze-test-file/starter.tsx?raw';
import analyzeSolution from './02-analyze-test-file/solution.tsx?raw';
import analyzeHints from './02-analyze-test-file/hints.md?raw';
import { checks as analyzeChecks } from './02-analyze-test-file/checks';
import concept2 from './03-humans-in-the-loop.md?raw';
import mutatePrompt from './04-mutation-and-refactor-planning/prompt.md?raw';
import mutateStarter from './04-mutation-and-refactor-planning/starter.tsx?raw';
import mutateSolution from './04-mutation-and-refactor-planning/solution.tsx?raw';
import mutateHints from './04-mutation-and-refactor-planning/hints.md?raw';
import { checks as mutateChecks } from './04-mutation-and-refactor-planning/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '101-ai-and-frontend-quality',
  title: 'AI and frontend quality',
  track: 'ai-assisted',
  summary: 'AI-assisted tests, accessibility audits, refactors, and keeping humans in the loop.',
  steps: [
    {
      kind: 'concept',
      id: 'ai-for-tests-a11y-and-refactors',
      title: 'AI for tests, a11y, and refactors: what it’s good at, and how to check it',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'analyze-test-file',
      title: 'Build a test-smell scanner',
      prompt: analyzePrompt,
      files: { 'App.tsx': analyzeStarter },
      solution: { 'App.tsx': analyzeSolution },
      hints: splitHints(analyzeHints),
      checks: analyzeChecks,
    },
    {
      kind: 'concept',
      id: 'humans-in-the-loop',
      title: 'Humans in the loop, by design',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'mutation-and-refactor-planning',
      title: 'Build a mutation tester and a refactor planner',
      prompt: mutatePrompt,
      files: { 'App.tsx': mutateStarter },
      solution: { 'App.tsx': mutateSolution },
      hints: splitHints(mutateHints),
      checks: mutateChecks,
    },
    quiz,
  ],
};

export default lesson;
