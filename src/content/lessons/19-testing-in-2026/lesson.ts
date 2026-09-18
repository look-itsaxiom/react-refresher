import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-a-strategy-not-a-pyramid.md?raw';
import prompt1 from './02-testable-order-summary/prompt.md?raw';
import starter1 from './02-testable-order-summary/starter.tsx?raw';
import solution1 from './02-testable-order-summary/solution.tsx?raw';
import hints1 from './02-testable-order-summary/hints.md?raw';
import { checks as checks1 } from './02-testable-order-summary/checks';
import concept2 from './03-designing-for-testability.md?raw';
import prompt2 from './04-extract-a-cart-reducer/prompt.md?raw';
import starter2 from './04-extract-a-cart-reducer/starter.tsx?raw';
import solution2 from './04-extract-a-cart-reducer/solution.tsx?raw';
import hints2 from './04-extract-a-cart-reducer/hints.md?raw';
import { checks as checks2 } from './04-extract-a-cart-reducer/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '19-testing-in-2026',
  title: 'A testing strategy for frontends',
  track: 'testing',
  summary: 'What to test where: unit, component, integration, e2e, visual, and the cost of each.',
  steps: [
    { kind: 'concept', id: 'a-strategy-not-a-pyramid', title: 'A strategy, not a pyramid argument', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'testable-order-summary',
      title: 'Make OrderSummary testable',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    { kind: 'concept', id: 'designing-for-testability', title: 'Designing for testability', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'extract-a-cart-reducer',
      title: 'Extract a cart reducer',
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
