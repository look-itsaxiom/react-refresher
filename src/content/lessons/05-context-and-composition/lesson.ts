import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-composition-before-context.md?raw';
import prompt1 from './02-fix-the-prop-drilling/prompt.md?raw';
import starter1 from './02-fix-the-prop-drilling/starter.tsx?raw';
import solution1 from './02-fix-the-prop-drilling/solution.tsx?raw';
import hints1 from './02-fix-the-prop-drilling/hints.md?raw';
import { checks as checks1 } from './02-fix-the-prop-drilling/checks';
import concept2 from './03-context-in-react-19.md?raw';
import prompt2 from './04-compound-tabs/prompt.md?raw';
import starter2 from './04-compound-tabs/starter.tsx?raw';
import solution2 from './04-compound-tabs/solution.tsx?raw';
import hints2 from './04-compound-tabs/hints.md?raw';
import { checks as checks2 } from './04-compound-tabs/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '05-context-and-composition',
  title: 'Context and composition',
  track: 'refresher',
  summary: 'Lifting state, children as data, context without prop drilling pain.',
  steps: [
    { kind: 'concept', id: 'composition-before-context', title: 'Composition before context', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'fix-the-prop-drilling',
      title: 'Fix the prop drilling',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    { kind: 'concept', id: 'context-in-react-19', title: 'Context in React 19', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'compound-tabs',
      title: 'Build a compound Tabs component',
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
