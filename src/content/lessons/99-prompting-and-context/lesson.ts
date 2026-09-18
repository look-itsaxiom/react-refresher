import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-specs-over-vibes.md?raw';
import promptA from './02-context-file-linter/prompt.md?raw';
import starterA from './02-context-file-linter/starter.tsx?raw';
import solutionA from './02-context-file-linter/solution.tsx?raw';
import hintsA from './02-context-file-linter/hints.md?raw';
import { checks as checksA } from './02-context-file-linter/checks';
import concept2 from './03-context-files-skills-mcp-and-review.md?raw';
import promptB from './04-context-budget-and-review/prompt.md?raw';
import starterB from './04-context-budget-and-review/starter.tsx?raw';
import solutionB from './04-context-budget-and-review/solution.tsx?raw';
import hintsB from './04-context-budget-and-review/hints.md?raw';
import { checks as checksB } from './04-context-budget-and-review/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '99-prompting-and-context',
  title: 'Prompting, context, and skills',
  track: 'ai-assisted',
  summary: 'Specs over vibes, context files, skills and MCP, and reviewing AI-written code.',
  steps: [
    { kind: 'concept', id: 'specs-over-vibes', title: 'Specs over vibes', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'context-file-linter',
      title: 'Build a context-file linter',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'context-files-skills-mcp-and-review', title: 'Context files, skills, MCP, and review', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'context-budget-and-review',
      title: 'Plan a context budget and score a review',
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
