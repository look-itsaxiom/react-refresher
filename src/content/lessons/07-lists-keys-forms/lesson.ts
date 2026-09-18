import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-reconciliation-and-identity.md?raw';
import prompt from './02-fix-the-keyed-list/prompt.md?raw';
import starter from './02-fix-the-keyed-list/starter.tsx?raw';
import solution from './02-fix-the-keyed-list/solution.tsx?raw';
import hints from './02-fix-the-keyed-list/hints.md?raw';
import { checks } from './02-fix-the-keyed-list/checks';
import concept2 from './03-controlled-and-uncontrolled-inputs.md?raw';
import formPrompt from './04-fix-the-controlled-form/prompt.md?raw';
import formStarter from './04-fix-the-controlled-form/starter.tsx?raw';
import formSolution from './04-fix-the-controlled-form/solution.tsx?raw';
import formHints from './04-fix-the-controlled-form/hints.md?raw';
import { checks as formChecks } from './04-fix-the-controlled-form/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '07-lists-keys-forms',
  title: 'Lists, keys, and controlled inputs',
  track: 'refresher',
  summary: 'Identity, reconciliation, and forms before Actions.',
  steps: [
    { kind: 'concept', id: 'reconciliation-and-identity', title: 'Reconciliation and identity', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'fix-the-keyed-list',
      title: 'Fix the keyed list',
      prompt,
      files: { 'App.tsx': starter },
      solution: { 'App.tsx': solution },
      hints: splitHints(hints),
      checks,
    },
    {
      kind: 'concept',
      id: 'controlled-and-uncontrolled-inputs',
      title: 'Controlled and uncontrolled inputs',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'fix-the-controlled-form',
      title: 'Fix the controlled form',
      prompt: formPrompt,
      files: { 'App.tsx': formStarter },
      solution: { 'App.tsx': formSolution },
      hints: splitHints(formHints),
      checks: formChecks,
    },
    quiz,
  ],
};

export default lesson;
