import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-what-a-static-host-does.md?raw';
import promptA from './02-resolve-a-request/prompt.md?raw';
import starterA from './02-resolve-a-request/starter.tsx?raw';
import solutionA from './02-resolve-a-request/solution.tsx?raw';
import hintsA from './02-resolve-a-request/hints.md?raw';
import { checks as checksA } from './02-resolve-a-request/checks';
import concept2 from './03-caching-redirects-and-fallbacks.md?raw';
import promptB from './04-plan-the-deploy/prompt.md?raw';
import starterB from './04-plan-the-deploy/starter.tsx?raw';
import solutionB from './04-plan-the-deploy/solution.tsx?raw';
import hintsB from './04-plan-the-deploy/hints.md?raw';
import { checks as checksB } from './04-plan-the-deploy/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '89-static-hosting-and-cdns',
  title: 'Static hosting and CDNs',
  track: 'deployment',
  summary: 'GitHub Pages, Netlify, Vercel, Cloudflare Pages; caching, redirects, and SPA fallbacks.',
  steps: [
    { kind: 'concept', id: 'what-a-static-host-does', title: 'What a static host actually does', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'resolve-a-request',
      title: 'Fix the static-host router',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'caching-redirects-and-fallbacks',
      title: 'Caching, redirects, and fallbacks done right',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'plan-the-deploy',
      title: 'Plan a deploy, and lock down preview URLs',
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
