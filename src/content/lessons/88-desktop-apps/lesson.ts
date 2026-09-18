import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-two-architectures.md?raw';
import promptA from './02-ipc-boundary/prompt.md?raw';
import starterA from './02-ipc-boundary/starter.tsx?raw';
import solutionA from './02-ipc-boundary/solution.tsx?raw';
import hintsA from './02-ipc-boundary/hints.md?raw';
import { checks as checksA } from './02-ipc-boundary/checks';
import concept2 from './03-shipping-and-safety.md?raw';
import promptB from './04-auto-update/prompt.md?raw';
import starterB from './04-auto-update/starter.tsx?raw';
import solutionB from './04-auto-update/solution.tsx?raw';
import hintsB from './04-auto-update/hints.md?raw';
import { checks as checksB } from './04-auto-update/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '88-desktop-apps',
  track: 'pwa',
  title: 'Desktop apps: Electron and Tauri',
  summary: 'Architectures, security models, packaging, and auto-update.',
  steps: [
    { kind: 'concept', id: 'two-architectures', title: 'Two architectures for a web UI on the desktop', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'ipc-boundary',
      title: 'Build the IPC boundary',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'shipping-and-safety', title: 'Shipping and keeping it safe', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'auto-update',
      title: 'Plan an auto-update',
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
