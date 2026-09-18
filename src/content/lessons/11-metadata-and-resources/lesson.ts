import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-metadata-in-components.md?raw';
import promptA from './02-product-metadata/prompt.md?raw';
import starterA from './02-product-metadata/starter.tsx?raw';
import solutionA from './02-product-metadata/solution.tsx?raw';
import hintsA from './02-product-metadata/hints.md?raw';
import { checks as checksA } from './02-product-metadata/checks';
import concept2 from './03-stylesheets-and-resources.md?raw';
import promptB from './04-preload-on-hover/prompt.md?raw';
import starterB from './04-preload-on-hover/starter.tsx?raw';
import solutionB from './04-preload-on-hover/solution.tsx?raw';
import hintsB from './04-preload-on-hover/hints.md?raw';
import { checks as checksB } from './04-preload-on-hover/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '11-metadata-and-resources',
  title: 'Document metadata and resource hints',
  track: 'react19',
  summary: 'title/meta/link in components, stylesheet precedence, preload APIs.',
  steps: [
    { kind: 'concept', id: 'metadata-in-components', title: 'Metadata belongs to the component', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'product-metadata',
      title: 'Set the title and description from the component',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'stylesheets-and-resources', title: 'Stylesheets and resource hints', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'preload-on-hover',
      title: 'Preload the hovered product image',
      prompt: promptB,
      files: { 'App.tsx': starterB },
      solution: { 'App.tsx': solutionB },
      hints: splitHints(hintsB),
      checks: checksB,
    },
    quiz,
  ],
};

export default lesson;
