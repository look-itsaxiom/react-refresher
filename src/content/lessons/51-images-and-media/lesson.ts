import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-images-are-the-lcp-problem.md?raw';
import responsiveImagePrompt from './02-responsive-image/prompt.md?raw';
import responsiveImageStarter from './02-responsive-image/starter.tsx?raw';
import responsiveImageSolution from './02-responsive-image/solution.tsx?raw';
import responsiveImageHints from './02-responsive-image/hints.md?raw';
import { checks as responsiveImageChecks } from './02-responsive-image/checks';
import concept2 from './03-video-embeds-and-the-long-tail.md?raw';
import imageBudgetPrompt from './04-image-budget/prompt.md?raw';
import imageBudgetStarter from './04-image-budget/starter.tsx?raw';
import imageBudgetSolution from './04-image-budget/solution.tsx?raw';
import imageBudgetHints from './04-image-budget/hints.md?raw';
import { checks as imageBudgetChecks } from './04-image-budget/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '51-images-and-media',
  title: 'Images and media',
  track: 'performance',
  summary: 'Formats, srcset and sizes, lazy loading, image CDNs, and video best practices.',
  steps: [
    {
      kind: 'concept',
      id: 'images-are-the-lcp-problem',
      title: 'Images are the LCP problem',
      markdown: concept1,
    },
    {
      kind: 'exercise',
      id: 'responsive-image',
      title: 'Build a ResponsiveImage component',
      prompt: responsiveImagePrompt,
      files: { 'App.tsx': responsiveImageStarter },
      solution: { 'App.tsx': responsiveImageSolution },
      hints: splitHints(responsiveImageHints),
      checks: responsiveImageChecks,
    },
    {
      kind: 'concept',
      id: 'video-embeds-and-the-long-tail',
      title: 'Video, embeds, and the long tail',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'image-budget',
      title: 'Audit a page\'s image budget',
      prompt: imageBudgetPrompt,
      files: { 'App.tsx': imageBudgetStarter },
      solution: { 'App.tsx': imageBudgetSolution },
      hints: splitHints(imageBudgetHints),
      checks: imageBudgetChecks,
    },
    quiz,
  ],
};

export default lesson;
