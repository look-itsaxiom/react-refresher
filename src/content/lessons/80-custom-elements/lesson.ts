import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-an-element-is-a-class.md?raw';
import counterPrompt from './02-x-counter/prompt.md?raw';
import counterStarter from './02-x-counter/starter.tsx?raw';
import counterSolution from './02-x-counter/solution.tsx?raw';
import counterHints from './02-x-counter/hints.md?raw';
import { checks as counterChecks } from './02-x-counter/checks';
import concept2 from './03-behaviour-events-and-lifecycle-hygiene.md?raw';
import tickerPrompt from './04-x-ticker/prompt.md?raw';
import tickerStarter from './04-x-ticker/starter.tsx?raw';
import tickerSolution from './04-x-ticker/solution.tsx?raw';
import tickerHints from './04-x-ticker/hints.md?raw';
import { checks as tickerChecks } from './04-x-ticker/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '80-custom-elements',
  title: 'Custom elements',
  track: 'web-components',
  summary: 'Defining elements, lifecycle callbacks, attributes vs properties, and events.',
  steps: [
    {
      kind: 'concept',
      id: 'an-element-is-a-class',
      title: 'An element is a class',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'x-counter',
      title: 'Build <x-counter>',
      prompt: counterPrompt,
      files: { 'App.tsx': counterStarter },
      solution: { 'App.tsx': counterSolution },
      hints: splitHints(counterHints),
      checks: counterChecks,
    },
    {
      kind: 'concept',
      id: 'behaviour-events-and-lifecycle-hygiene',
      title: 'Behaviour, events, and lifecycle hygiene',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'x-ticker',
      title: 'Fix <x-ticker>',
      prompt: tickerPrompt,
      files: { 'App.tsx': tickerStarter },
      solution: { 'App.tsx': tickerSolution },
      hints: splitHints(tickerHints),
      checks: tickerChecks,
    },
    quiz,
  ],
};

export default lesson;
