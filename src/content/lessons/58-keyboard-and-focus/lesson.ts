import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-keyboard-first.md?raw';
import trapPrompt from './02-trap-and-return/prompt.md?raw';
import trapStarter from './02-trap-and-return/starter.tsx?raw';
import trapSolution from './02-trap-and-return/solution.tsx?raw';
import trapHints from './02-trap-and-return/hints.md?raw';
import { checks as trapChecks } from './02-trap-and-return/checks';
import concept2 from './03-managing-focus-deliberately.md?raw';
import toolbarPrompt from './04-roving-tabindex-toolbar/prompt.md?raw';
import toolbarStarter from './04-roving-tabindex-toolbar/starter.tsx?raw';
import toolbarSolution from './04-roving-tabindex-toolbar/solution.tsx?raw';
import toolbarHints from './04-roving-tabindex-toolbar/hints.md?raw';
import { checks as toolbarChecks } from './04-roving-tabindex-toolbar/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '58-keyboard-and-focus',
  title: 'Keyboard and focus management',
  track: 'accessibility',
  summary: 'Tab order, focus traps, roving tabindex, dialogs, inert, and the popover API.',
  steps: [
    {
      kind: 'concept',
      id: 'keyboard-first',
      title: 'Everything must work with a keyboard',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'trap-and-return',
      title: 'Trap and return',
      prompt: trapPrompt,
      files: { 'App.tsx': trapStarter },
      solution: { 'App.tsx': trapSolution },
      hints: splitHints(trapHints),
      checks: trapChecks,
    },
    {
      kind: 'concept',
      id: 'managing-focus-deliberately',
      title: 'Managing focus deliberately',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'roving-tabindex-toolbar',
      title: 'Roving tabindex toolbar',
      prompt: toolbarPrompt,
      files: { 'App.tsx': toolbarStarter },
      solution: { 'App.tsx': toolbarSolution },
      hints: splitHints(toolbarHints),
      checks: toolbarChecks,
    },
    quiz,
  ],
};

export default lesson;
