import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-four-ways-to-ship.md?raw';
import promptA from './02-rn-primitives/prompt.md?raw';
import starterA from './02-rn-primitives/starter.tsx?raw';
import solutionA from './02-rn-primitives/solution.tsx?raw';
import hintsA from './02-rn-primitives/hints.md?raw';
import { checks as checksA } from './02-rn-primitives/checks';
import concept2 from './03-react-native-and-expo.md?raw';
import promptB from './04-capacitor-bridge/prompt.md?raw';
import starterB from './04-capacitor-bridge/starter.tsx?raw';
import solutionB from './04-capacitor-bridge/solution.tsx?raw';
import hintsB from './04-capacitor-bridge/hints.md?raw';
import { checks as checksB } from './04-capacitor-bridge/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '87-mobile-apps-from-web-skills',
  track: 'pwa',
  title: 'Mobile apps from web skills',
  summary: 'React Native and Expo, Capacitor, Ionic, and where Flutter fits.',
  steps: [
    { kind: 'concept', id: 'four-ways-to-ship', title: 'Four ways to ship web skills to phones', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'rn-primitives',
      title: "Build React Native's primitives",
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'react-native-and-expo', title: 'React Native and Expo in 2026', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'capacitor-bridge',
      title: 'Build a Capacitor-style plugin bridge',
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
