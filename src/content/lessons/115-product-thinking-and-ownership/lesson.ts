import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-product-thinking-in-an-engineers-words.md?raw';
import concept2 from './02-stories-to-prepare-and-questions-to-ask.md?raw';

import prompt from './03-story-worksheet/prompt.md?raw';
import starter from './03-story-worksheet/starter.tsx?raw';
import solution from './03-story-worksheet/solution.tsx?raw';
import hints from './03-story-worksheet/hints.md?raw';
import { checks } from './03-story-worksheet/checks';

import { quiz } from './04-quiz';

const lesson: Lesson = {
  id: '115-product-thinking-and-ownership',
  title: 'Product thinking and ownership',
  track: 'interview',
  summary:
    'Talking about tradeoffs, pushing back on specs, UX polish as an engineering requirement, and questions to ask.',
  steps: [
    {
      kind: 'concept',
      id: 'product-thinking-in-an-engineers-words',
      title: "Product thinking, in an engineer's words",
      markdown: concept1,
    },
    {
      kind: 'concept',
      id: 'stories-to-prepare-and-questions-to-ask',
      title: 'Stories to prepare and questions to ask',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'story-worksheet',
      title: 'Story worksheet',
      prompt,
      files: { 'App.tsx': starter },
      solution: { 'App.tsx': solution },
      hints: splitHints(hints),
      checks,
    },
    quiz,
  ],
};

export default lesson;
