import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-async-control-flow-you-should-own.md?raw';
import promptA from './02-map-with-concurrency/prompt.md?raw';
import starterA from './02-map-with-concurrency/starter.tsx?raw';
import solutionA from './02-map-with-concurrency/solution.tsx?raw';
import hintsA from './02-map-with-concurrency/hints.md?raw';
import { checks as checksA } from './02-map-with-concurrency/checks';
import concept2 from './03-timing-pitfalls-in-the-browser.md?raw';
import promptB from './04-async-iteration-with-event-streams/prompt.md?raw';
import starterB from './04-async-iteration-with-event-streams/starter.tsx?raw';
import solutionB from './04-async-iteration-with-event-streams/solution.tsx?raw';
import hintsB from './04-async-iteration-with-event-streams/hints.md?raw';
import { checks as checksB } from './04-async-iteration-with-event-streams/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '32-event-loop-and-async',
  title: 'The event loop and async patterns',
  track: 'javascript-typescript',
  summary: 'Microtasks vs tasks, scheduler.yield, AbortSignal, async iteration, and cancellation.',
  steps: [
    { kind: 'concept', id: 'async-control-flow-you-should-own', title: 'Async control flow you should own', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'map-with-concurrency',
      title: 'Limit concurrency, correctly',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'timing-pitfalls-in-the-browser', title: 'Timing pitfalls in the browser', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'async-iteration-with-event-streams',
      title: 'Async iteration with an event stream',
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
