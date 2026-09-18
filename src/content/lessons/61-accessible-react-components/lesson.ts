import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-buy-the-hard-parts.md?raw';
import concept2 from './02-anatomy-of-a-compliant-combobox.md?raw';
import comboboxPrompt from './03-accessible-combobox/prompt.md?raw';
import comboboxStarter from './03-accessible-combobox/starter.tsx?raw';
import comboboxSolution from './03-accessible-combobox/solution.tsx?raw';
import comboboxHints from './03-accessible-combobox/hints.md?raw';
import { checks as comboboxChecks } from './03-accessible-combobox/checks';
import accordionPrompt from './04-accessible-accordion/prompt.md?raw';
import accordionStarter from './04-accessible-accordion/starter.tsx?raw';
import accordionSolution from './04-accessible-accordion/solution.tsx?raw';
import accordionHints from './04-accessible-accordion/hints.md?raw';
import { checks as accordionChecks } from './04-accessible-accordion/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '61-accessible-react-components',
  title: 'Accessible React components',
  track: 'accessibility',
  summary: 'Headless libraries (Radix, Base UI, React Aria) and building a compliant combobox.',
  steps: [
    {
      kind: 'concept',
      id: 'buy-the-hard-parts',
      title: 'Buy the hard parts',
      markdown: concept1,
    },
    {
      kind: 'concept',
      id: 'anatomy-of-a-compliant-combobox',
      title: 'Anatomy of a compliant combobox',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'accessible-combobox',
      title: 'Accessible combobox',
      prompt: comboboxPrompt,
      files: { 'App.tsx': comboboxStarter },
      solution: { 'App.tsx': comboboxSolution },
      hints: splitHints(comboboxHints),
      checks: comboboxChecks,
    },
    {
      kind: 'exercise',
      id: 'accessible-accordion',
      title: 'Accessible accordion',
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
