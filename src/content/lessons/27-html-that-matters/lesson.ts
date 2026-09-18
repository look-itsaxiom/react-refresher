import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-semantics-you-should-be-using.md?raw';
import formPrompt from './02-semantic-signup-form/prompt.md?raw';
import formStarter from './02-semantic-signup-form/starter.tsx?raw';
import formSolution from './02-semantic-signup-form/solution.tsx?raw';
import formHints from './02-semantic-signup-form/hints.md?raw';
import { checks as formChecks } from './02-semantic-signup-form/checks';
import concept2 from './03-forms-the-platform-already-handles.md?raw';
import accordionPrompt from './04-accordion-and-dialog/prompt.md?raw';
import accordionStarter from './04-accordion-and-dialog/starter.tsx?raw';
import accordionSolution from './04-accordion-and-dialog/solution.tsx?raw';
import accordionHints from './04-accordion-and-dialog/hints.md?raw';
import { checks as accordionChecks } from './04-accordion-and-dialog/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '27-html-that-matters',
  title: 'HTML that matters in 2026',
  track: 'web-platform',
  summary: 'Semantics, forms and validation, dialog and popover, details, and the platform features that replace JS.',
  steps: [
    {
      kind: 'concept',
      id: 'semantics-you-should-be-using',
      title: 'Semantics you should be using',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'semantic-signup-form',
      title: 'Rebuild the signup form',
      prompt: formPrompt,
      files: { 'App.tsx': formStarter },
      solution: { 'App.tsx': formSolution },
      hints: splitHints(formHints),
      checks: formChecks,
    },
    {
      kind: 'concept',
      id: 'forms-the-platform-already-handles',
      title: 'Forms the platform already handles',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'accordion-and-dialog',
      title: 'Replace the accordion and modal',
      prompt: accordionPrompt,
      files: { 'App.tsx': accordionStarter },
      solution: { 'App.tsx': accordionSolution },
      hints: splitHints(accordionHints),
      checks: accordionChecks,
    },
    quiz,
  ],
};

export default lesson;
