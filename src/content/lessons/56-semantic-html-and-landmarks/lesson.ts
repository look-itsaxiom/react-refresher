import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-landmarks-and-headings-are-the-map.md?raw';
import tablePrompt from './02-make-the-table-a-table/prompt.md?raw';
import tableStarter from './02-make-the-table-a-table/starter.tsx?raw';
import tableSolution from './02-make-the-table-a-table/solution.tsx?raw';
import tableHints from './02-make-the-table-a-table/hints.md?raw';
import { checks as tableChecks } from './02-make-the-table-a-table/checks';
import concept2 from './03-tables-lists-and-text-semantics.md?raw';
import skipPrompt from './04-label-the-map-and-skip-link/prompt.md?raw';
import skipStarter from './04-label-the-map-and-skip-link/starter.tsx?raw';
import skipSolution from './04-label-the-map-and-skip-link/solution.tsx?raw';
import skipHints from './04-label-the-map-and-skip-link/hints.md?raw';
import { checks as skipChecks } from './04-label-the-map-and-skip-link/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '56-semantic-html-and-landmarks',
  title: 'Semantic HTML and landmarks',
  track: 'accessibility',
  summary: 'Headings, landmarks, lists, tables, and why divs with click handlers fail.',
  steps: [
    {
      kind: 'concept',
      id: 'landmarks-and-headings-are-the-map',
      title: 'Landmarks and headings are the map',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'make-the-table-a-table',
      title: 'Make the table a table',
      prompt: tablePrompt,
      files: { 'App.tsx': tableStarter },
      solution: { 'App.tsx': tableSolution },
      hints: splitHints(tableHints),
      checks: tableChecks,
    },
    {
      kind: 'concept',
      id: 'tables-lists-and-text-semantics',
      title: 'Tables, lists, and text semantics',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'label-the-map-and-skip-link',
      title: 'Label the map and add a skip link',
      prompt: skipPrompt,
      files: { 'App.tsx': skipStarter },
      solution: { 'App.tsx': skipSolution },
      hints: splitHints(skipHints),
      checks: skipChecks,
    },
    quiz,
  ],
};

export default lesson;
