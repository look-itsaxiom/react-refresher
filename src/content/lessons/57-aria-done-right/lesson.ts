import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-the-rules-and-what-aria-can-and-cannot-do.md?raw';
import fixAriaPrompt from './02-fix-the-aria/prompt.md?raw';
import fixAriaStarter from './02-fix-the-aria/starter.tsx?raw';
import fixAriaSolution from './02-fix-the-aria/solution.tsx?raw';
import fixAriaHints from './02-fix-the-aria/hints.md?raw';
import { checks as fixAriaChecks } from './02-fix-the-aria/checks';
import concept2 from './03-widgets-and-live-regions-that-actually-work.md?raw';
import announcePrompt from './04-announce-it-right/prompt.md?raw';
import announceStarter from './04-announce-it-right/starter.tsx?raw';
import announceSolution from './04-announce-it-right/solution.tsx?raw';
import announceHints from './04-announce-it-right/hints.md?raw';
import { checks as announceChecks } from './04-announce-it-right/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '57-aria-done-right',
  title: 'ARIA, done right',
  track: 'accessibility',
  summary: 'Roles, states, properties, live regions, and the first rule of ARIA.',
  steps: [
    {
      kind: 'concept',
      id: 'the-rules-and-what-aria-can-and-cannot-do',
      title: 'The rules, and what ARIA can and cannot do',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'fix-the-aria',
      title: 'Fix the ARIA',
      prompt: fixAriaPrompt,
      files: { 'App.tsx': fixAriaStarter },
      solution: { 'App.tsx': fixAriaSolution },
      hints: splitHints(fixAriaHints),
      checks: fixAriaChecks,
    },
    {
      kind: 'concept',
      id: 'widgets-and-live-regions-that-actually-work',
      title: 'Widgets and live regions that actually work',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'announce-it-right',
      title: 'Announce it right',
      prompt: announcePrompt,
      files: { 'App.tsx': announceStarter },
      solution: { 'App.tsx': announceSolution },
      hints: splitHints(announceHints),
      checks: announceChecks,
    },
    quiz,
  ],
};

export default lesson;
