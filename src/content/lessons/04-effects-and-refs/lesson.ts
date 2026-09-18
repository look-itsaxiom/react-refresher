import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-what-effects-are-for.md?raw';
import concept2 from './02-you-might-not-need-an-effect.md?raw';
import prompt1 from './03-derive-dont-synchronize/prompt.md?raw';
import starter1 from './03-derive-dont-synchronize/starter.tsx?raw';
import solution1 from './03-derive-dont-synchronize/solution.tsx?raw';
import hints1 from './03-derive-dont-synchronize/hints.md?raw';
import { checks as checks1 } from './03-derive-dont-synchronize/checks';
import concept3 from './04-refs-and-imperative-escapes.md?raw';
import prompt2 from './05-chat-room-cleanup/prompt.md?raw';
import starter2 from './05-chat-room-cleanup/starter.tsx?raw';
import solution2 from './05-chat-room-cleanup/solution.tsx?raw';
import hints2 from './05-chat-room-cleanup/hints.md?raw';
import { checks as checks2 } from './05-chat-room-cleanup/checks';
import { quiz } from './06-quiz';

const lesson: Lesson = {
  id: '04-effects-and-refs',
  title: 'You might not need an effect',
  track: 'refresher',
  summary: 'What effects are for, what they are not for, refs, and cleanup.',
  steps: [
    { kind: 'concept', id: 'what-effects-are-for', title: 'What effects are actually for', markdown: concept1 },
    {
      kind: 'concept',
      id: 'you-might-not-need-an-effect',
      title: 'You might not need an effect',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'derive-dont-synchronize',
      title: 'Derive, don’t synchronize',
      prompt: prompt1,
      files: { 'App.tsx': starter1 },
      solution: { 'App.tsx': solution1 },
      hints: splitHints(hints1),
      checks: checks1,
    },
    {
      kind: 'concept',
      id: 'refs-and-imperative-escapes',
      title: 'Refs: mutable values, DOM nodes, and imperative escapes',
      markdown: concept3,
    },
    {
      kind: 'exercise',
      id: 'chat-room-cleanup',
      title: 'Clean up the chat room connection',
      prompt: prompt2,
      files: { 'App.tsx': starter2 },
      solution: { 'App.tsx': solution2 },
      hints: splitHints(hints2),
      checks: checks2,
    },
    quiz,
  ],
};

export default lesson;
