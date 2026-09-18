import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-vitest-as-a-system.md?raw';
import prompt1 from './02-mini-test-runner/prompt.md?raw';
import starter1 from './02-mini-test-runner/starter.tsx?raw';
import solution1 from './02-mini-test-runner/solution.tsx?raw';
import hints1 from './02-mini-test-runner/hints.md?raw';
import { checks as checks1 } from './02-mini-test-runner/checks';
import concept2 from './03-mocks-time-and-the-browser.md?raw';
import prompt2 from './04-mocks-and-fake-time/prompt.md?raw';
import starter2 from './04-mocks-and-fake-time/starter.tsx?raw';
import solution2 from './04-mocks-and-fake-time/solution.tsx?raw';
import hints2 from './04-mocks-and-fake-time/hints.md?raw';
import { checks as checks2 } from './04-mocks-and-fake-time/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '40-vitest-deep-dive',
  title: 'Vitest deep dive',
  track: 'testing',
  summary: 'Browser Mode, mocking, fake timers, snapshots, coverage, and workspace projects.',
  steps: [
    { kind: 'concept', id: 'vitest-as-a-system', title: 'Vitest as a system', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'mini-test-runner',
      title: 'Build a mini test runner',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    { kind: 'concept', id: 'mocks-time-and-the-browser', title: 'Mocks, time, and the browser', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'mocks-and-fake-time',
      title: 'Mocks and fake time',
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
