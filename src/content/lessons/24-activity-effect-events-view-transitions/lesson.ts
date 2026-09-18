import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-activity.md?raw';
import promptA from './02-tabs-with-activity/prompt.md?raw';
import starterA from './02-tabs-with-activity/starter.tsx?raw';
import solutionA from './02-tabs-with-activity/solution.tsx?raw';
import hintsA from './02-tabs-with-activity/hints.md?raw';
import { checks as checksA } from './02-tabs-with-activity/checks';
import concept2 from './03-effect-events-and-view-transitions.md?raw';
import promptB from './04-fix-the-resubscribing-effect/prompt.md?raw';
import starterB from './04-fix-the-resubscribing-effect/starter.tsx?raw';
import solutionB from './04-fix-the-resubscribing-effect/solution.tsx?raw';
import hintsB from './04-fix-the-resubscribing-effect/hints.md?raw';
import { checks as checksB } from './04-fix-the-resubscribing-effect/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '24-activity-effect-events-view-transitions',
  title: 'Activity, useEffectEvent, ViewTransition',
  track: 'react19',
  summary: 'The 19.2 and 19.3 primitives: hide-but-keep-state, non-reactive effect logic, animated transitions.',
  steps: [
    { kind: 'concept', id: 'activity', title: '<Activity>: hidden but alive', markdown: concept1 },
    { kind: 'exercise', id: 'tabs-with-activity', title: 'Fix the tabs that lose your draft', prompt: promptA, files: { 'App.tsx': starterA }, solution: { 'App.tsx': solutionA }, hints: splitHints(hintsA), checks: checksA },
    { kind: 'concept', id: 'effect-events-and-view-transitions', title: 'useEffectEvent and <ViewTransition>', markdown: concept2 },
    { kind: 'exercise', id: 'fix-the-resubscribing-effect', title: 'Stop the reconnect-on-theme-toggle bug', prompt: promptB, files: { 'App.tsx': starterB }, solution: { 'App.tsx': solutionB }, hints: splitHints(hintsB), checks: checksB },
    quiz,
  ],
};

export default lesson;
