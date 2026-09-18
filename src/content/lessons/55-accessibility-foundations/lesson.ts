import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-who-why-and-the-law.md?raw';
import contrastPrompt from './02-contrast-checker/prompt.md?raw';
import contrastStarter from './02-contrast-checker/starter.tsx?raw';
import contrastSolution from './02-contrast-checker/solution.tsx?raw';
import contrastHints from './02-contrast-checker/hints.md?raw';
import { checks as contrastChecks } from './02-contrast-checker/checks';
import concept2 from './03-the-accessibility-tree-is-your-real-output.md?raw';
import treePrompt from './04-fix-the-tree/prompt.md?raw';
import treeStarter from './04-fix-the-tree/starter.tsx?raw';
import treeSolution from './04-fix-the-tree/solution.tsx?raw';
import treeHints from './04-fix-the-tree/hints.md?raw';
import { checks as treeChecks } from './04-fix-the-tree/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '55-accessibility-foundations',
  title: 'Accessibility foundations',
  track: 'accessibility',
  summary: 'WCAG 2.2, the POUR principles, legal context, and how assistive tech consumes the page.',
  steps: [
    {
      kind: 'concept',
      id: 'who-why-and-the-law',
      title: 'Who, why, and what the law now says',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'contrast-checker',
      title: 'Build a WCAG contrast checker',
      prompt: contrastPrompt,
      files: { 'App.tsx': contrastStarter },
      solution: { 'App.tsx': contrastSolution },
      hints: splitHints(contrastHints),
      checks: contrastChecks,
    },
    {
      kind: 'concept',
      id: 'the-accessibility-tree-is-your-real-output',
      title: 'The accessibility tree is your real output',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'fix-the-tree',
      title: 'Fix the tree',
      prompt: treePrompt,
      files: { 'App.tsx': treeStarter },
      solution: { 'App.tsx': treeSolution },
      hints: splitHints(treeHints),
      checks: treeChecks,
    },
    quiz,
  ],
};

export default lesson;
