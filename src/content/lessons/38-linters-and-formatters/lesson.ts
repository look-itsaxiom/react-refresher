import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-parsing-rules-and-the-split.md?raw';
import promptA from './02-mini-lint-engine/prompt.md?raw';
import starterA from './02-mini-lint-engine/starter.tsx?raw';
import solutionA from './02-mini-lint-engine/solution.tsx?raw';
import hintsA from './02-mini-lint-engine/hints.md?raw';
import { checks as checksA } from './02-mini-lint-engine/checks';
import concept2 from './03-a-2026-setup.md?raw';
import promptB from './04-organize-imports/prompt.md?raw';
import starterB from './04-organize-imports/starter.tsx?raw';
import solutionB from './04-organize-imports/solution.tsx?raw';
import hintsB from './04-organize-imports/hints.md?raw';
import { checks as checksB } from './04-organize-imports/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '38-linters-and-formatters',
  title: 'Linters and formatters',
  track: 'tooling',
  summary: 'Biome, oxlint, ESLint flat config, Prettier, type-aware rules, and pre-commit hooks.',
  steps: [
    { kind: 'concept', id: 'parsing-rules-and-the-split', title: 'What linters and formatters actually do', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'mini-lint-engine',
      title: 'Build a mini lint engine',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'a-2026-setup', title: 'A 2026 setup that does not fight you', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'organize-imports',
      title: 'Organize imports like a formatter would',
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
