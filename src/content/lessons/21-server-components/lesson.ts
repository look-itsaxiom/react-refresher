import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-two-environments-one-tree.md?raw';
import prompt1 from './02-can-cross-boundary/prompt.md?raw';
import starter1 from './02-can-cross-boundary/starter.tsx?raw';
import solution1 from './02-can-cross-boundary/solution.tsx?raw';
import hints1 from './02-can-cross-boundary/hints.md?raw';
import { checks as checks1 } from './02-can-cross-boundary/checks';
import concept2 from './03-serialization-security-and-mental-traps.md?raw';
import prompt2 from './04-mini-rsc-payload/prompt.md?raw';
import starter2 from './04-mini-rsc-payload/starter.tsx?raw';
import solution2 from './04-mini-rsc-payload/solution.tsx?raw';
import hints2 from './04-mini-rsc-payload/hints.md?raw';
import { checks as checks2 } from './04-mini-rsc-payload/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '21-server-components',
  title: 'Server Components',
  track: 'server',
  summary: 'The client/server boundary, "use client", serialization rules.',
  steps: [
    { kind: 'concept', id: 'two-environments-one-tree', title: 'Two environments, one tree', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'can-cross-boundary',
      title: 'Model the serialization boundary',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    {
      kind: 'concept',
      id: 'serialization-security-and-mental-traps',
      title: 'Serialization, security, and mental traps',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'mini-rsc-payload',
      title: 'Build a miniature RSC payload renderer',
      prompt: prompt2,
      files: { 'App.tsx': starter2 },
      solution: { 'App.tsx': solution2 },
      hints: splitHints(hints2),
      checks: checks2,
    },
    quiz,
  ],
};

export default lesson;
