import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-rust-wave.md?raw';
import promptA from './02-analyze-stats/prompt.md?raw';
import starterA from './02-analyze-stats/starter.tsx?raw';
import solutionA from './02-analyze-stats/solution.tsx?raw';
import hintsA from './02-analyze-stats/hints.md?raw';
import { checks as checksA } from './02-analyze-stats/checks';
import concept2 from './03-choosing-and-migrating.md?raw';
import promptB from './04-migrate-webpack-config/prompt.md?raw';
import starterB from './04-migrate-webpack-config/starter.tsx?raw';
import solutionB from './04-migrate-webpack-config/solution.tsx?raw';
import hintsB from './04-migrate-webpack-config/hints.md?raw';
import { checks as checksB } from './04-migrate-webpack-config/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '37-bundler-landscape',
  title: 'Vite, Rolldown, esbuild, SWC, Turbopack',
  track: 'tooling',
  summary: 'The 2026 bundler landscape, what runs on Rust, and how to migrate from webpack.',
  steps: [
    { kind: 'concept', id: 'rust-wave', title: 'The Rust wave and what it changed', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'analyze-stats',
      title: 'Audit a build stats object',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'choosing-and-migrating', title: 'Choosing and migrating', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'migrate-webpack-config',
      title: 'Migrate a webpack config to Vite',
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
