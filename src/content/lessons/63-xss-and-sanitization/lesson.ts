import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-how-xss-happens.md?raw';
import promptA from './02-sanitize-html/prompt.md?raw';
import starterA from './02-sanitize-html/starter.tsx?raw';
import solutionA from './02-sanitize-html/solution.tsx?raw';
import hintsA from './02-sanitize-html/hints.md?raw';
import { checks as checksA } from './02-sanitize-html/checks';
import concept2 from './03-defenses-that-hold.md?raw';
import promptB from './04-fix-comment-thread/prompt.md?raw';
import starterB from './04-fix-comment-thread/starter.tsx?raw';
import solutionB from './04-fix-comment-thread/solution.tsx?raw';
import hintsB from './04-fix-comment-thread/hints.md?raw';
import { checks as checksB } from './04-fix-comment-thread/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '63-xss-and-sanitization',
  title: 'XSS and sanitization',
  track: 'security',
  summary: 'Reflected, stored, DOM-based XSS; React escaping; DOMPurify; Trusted Types.',
  steps: [
    { kind: 'concept', id: 'how-xss-happens', title: 'How XSS actually happens in React apps', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'sanitize-html',
      title: 'Sanitize HTML with an allowlist',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'defenses-that-hold', title: 'Defenses that hold', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'fix-comment-thread',
      title: "Fix CommentThread",
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
