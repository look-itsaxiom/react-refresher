import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-what-e2e-is-for.md?raw';
import prompt1 from './02-locator-engine/prompt.md?raw';
import starter1 from './02-locator-engine/starter.tsx?raw';
import solution1 from './02-locator-engine/solution.tsx?raw';
import hints1 from './02-locator-engine/hints.md?raw';
import { checks as checks1 } from './02-locator-engine/checks';
import concept2 from './03-making-e2e-cheap-to-own.md?raw';
import prompt2 from './04-auto-wait-and-actionability/prompt.md?raw';
import starter2 from './04-auto-wait-and-actionability/starter.tsx?raw';
import solution2 from './04-auto-wait-and-actionability/solution.tsx?raw';
import hints2 from './04-auto-wait-and-actionability/hints.md?raw';
import { checks as checks2 } from './04-auto-wait-and-actionability/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '42-playwright-e2e',
  title: 'End-to-end with Playwright',
  track: 'testing',
  summary: 'Locators, fixtures, tracing, network mocking, and running against preview deploys.',
  steps: [
    { kind: 'concept', id: 'what-e2e-is-for', title: "What e2e is for, and Playwright's model", markdown: concept1 },
    {
      kind: 'exercise',
      id: 'locator-engine',
      title: 'Build a locator engine',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    { kind: 'concept', id: 'making-e2e-cheap-to-own', title: 'Making e2e cheap to own', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'auto-wait-and-actionability',
      title: 'Implement auto-waiting',
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
