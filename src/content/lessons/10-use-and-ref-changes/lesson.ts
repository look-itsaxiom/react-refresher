import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-use-in-depth.md?raw';
import promptA from './02-ref-as-a-prop/prompt.md?raw';
import starterA from './02-ref-as-a-prop/starter.tsx?raw';
import solutionA from './02-ref-as-a-prop/solution.tsx?raw';
import hintsA from './02-ref-as-a-prop/hints.md?raw';
import { checks as checksA } from './02-ref-as-a-prop/checks';
import concept2 from './03-refs-in-react-19.md?raw';
import promptB from './04-fix-the-leaking-observer/prompt.md?raw';
import starterB from './04-fix-the-leaking-observer/starter.tsx?raw';
import solutionB from './04-fix-the-leaking-observer/solution.tsx?raw';
import hintsB from './04-fix-the-leaking-observer/hints.md?raw';
import { checks as checksB } from './04-fix-the-leaking-observer/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '10-use-and-ref-changes',
  title: 'use(), ref as a prop, ref cleanup',
  track: 'react19',
  summary: 'Reading promises and context with use(); forwardRef is over.',
  steps: [
    { kind: 'concept', id: 'use-in-depth', title: 'use(): the rest of the story', markdown: concept1 },
    { kind: 'exercise', id: 'ref-as-a-prop', title: 'Ref as a prop', prompt: promptA, files: { 'App.tsx': starterA }, solution: { 'App.tsx': solutionA }, hints: splitHints(hintsA), checks: checksA },
    { kind: 'concept', id: 'refs-in-react-19', title: "Refs in React 19: forwardRef's retirement and cleanup callbacks", markdown: concept2 },
    { kind: 'exercise', id: 'fix-the-leaking-observer', title: 'Fix the leaking observer', prompt: promptB, files: { 'App.tsx': starterB }, solution: { 'App.tsx': solutionB }, hints: splitHints(hintsB), checks: checksB },
    quiz,
  ],
};

export default lesson;
