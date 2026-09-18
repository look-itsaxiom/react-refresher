import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-automated-checks-what-they-catch-and-what-they-miss.md?raw';
import auditPrompt from './02-audit-a11y/prompt.md?raw';
import auditStarter from './02-audit-a11y/starter.tsx?raw';
import auditSolution from './02-audit-a11y/solution.tsx?raw';
import auditHints from './02-audit-a11y/hints.md?raw';
import { checks as auditChecks } from './02-audit-a11y/checks';
import concept2 from './03-the-manual-layer-made-repeatable.md?raw';
import greenPrompt from './04-green-the-audit/prompt.md?raw';
import greenStarter from './04-green-the-audit/starter.tsx?raw';
import greenSolution from './04-green-the-audit/solution.tsx?raw';
import greenHints from './04-green-the-audit/hints.md?raw';
import { checks as greenChecks } from './04-green-the-audit/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '60-testing-accessibility',
  title: 'Testing accessibility',
  track: 'accessibility',
  summary: 'axe, Testing Library role queries, Playwright a11y checks, and screen reader smoke tests.',
  steps: [
    {
      kind: 'concept',
      id: 'automated-checks-what-they-catch-and-what-they-miss',
      title: 'Automated checks: what they catch and what they miss',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'audit-a11y',
      title: 'Build a mini axe',
      prompt: auditPrompt,
      files: { 'App.tsx': auditStarter },
      solution: { 'App.tsx': auditSolution },
      hints: splitHints(auditHints),
      checks: auditChecks,
    },
    {
      kind: 'concept',
      id: 'the-manual-layer-made-repeatable',
      title: 'The manual layer, made repeatable',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'green-the-audit',
      title: 'Green the audit',
      prompt: greenPrompt,
      files: { 'App.tsx': greenStarter },
      solution: { 'App.tsx': greenSolution },
      hints: splitHints(greenHints),
      checks: greenChecks,
    },
    quiz,
  ],
};

export default lesson;
