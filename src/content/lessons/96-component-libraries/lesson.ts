import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-the-library-landscape.md?raw';
import concept2 from './02-patterns-under-every-primitive.md?raw';
import slotTabsPrompt from './03-slot-and-tabs/prompt.md?raw';
import slotTabsStarter from './03-slot-and-tabs/starter.tsx?raw';
import slotTabsSolution from './03-slot-and-tabs/solution.tsx?raw';
import slotTabsHints from './03-slot-and-tabs/hints.md?raw';
import { checks as slotTabsChecks } from './03-slot-and-tabs/checks';
import disclosurePrompt from './04-primitive-and-disclosure/prompt.md?raw';
import disclosureStarter from './04-primitive-and-disclosure/starter.tsx?raw';
import disclosureSolution from './04-primitive-and-disclosure/solution.tsx?raw';
import disclosureHints from './04-primitive-and-disclosure/hints.md?raw';
import { checks as disclosureChecks } from './04-primitive-and-disclosure/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '96-component-libraries',
  title: 'Component libraries and headless UI',
  track: 'design-systems',
  summary: 'shadcn/ui on Base UI, Radix, React Aria, and building your own primitives.',
  steps: [
    {
      kind: 'concept',
      id: 'the-library-landscape',
      title: 'The library landscape, and why headless won',
      markdown: concept1,
    },
    {
      kind: 'concept',
      id: 'patterns-under-every-primitive',
      title: 'The patterns under every primitive',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'slot-and-tabs',
      title: 'Slot and Tabs',
      prompt: slotTabsPrompt,
      files: { 'App.tsx': slotTabsStarter },
      solution: { 'App.tsx': slotTabsSolution },
      hints: splitHints(slotTabsHints),
      checks: slotTabsChecks,
    },
    {
      kind: 'exercise',
      id: 'primitive-and-disclosure',
      title: 'mergeProps, Disclosure, and Portal',
      prompt: disclosurePrompt,
      files: { 'App.tsx': disclosureStarter },
      solution: { 'App.tsx': disclosureSolution },
      hints: splitHints(disclosureHints),
      checks: disclosureChecks,
    },
    quiz,
  ],
};

export default lesson;
