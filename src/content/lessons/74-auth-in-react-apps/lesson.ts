import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-auth-state.md?raw';
import promptA from './02-auth-store-and-guard/prompt.md?raw';
import starterA from './02-auth-store-and-guard/starter.tsx?raw';
import solutionA from './02-auth-store-and-guard/solution.tsx?raw';
import hintsA from './02-auth-store-and-guard/hints.md?raw';
import { checks as checksA } from './02-auth-store-and-guard/checks';
import concept2 from './03-buy-borrow-or-build.md?raw';
import promptB from './04-guard-plan/prompt.md?raw';
import starterB from './04-guard-plan/starter.tsx?raw';
import solutionB from './04-guard-plan/solution.tsx?raw';
import hintsB from './04-guard-plan/hints.md?raw';
import { checks as checksB } from './04-guard-plan/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '74-auth-in-react-apps',
  title: 'Auth in React apps',
  track: 'auth',
  summary: 'Protected routes, session refresh, Auth.js, Clerk, Better Auth, and Supabase compared.',
  steps: [
    { kind: 'concept', id: 'auth-state', title: 'Where auth state lives in a React app', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'auth-store-and-guard',
      title: 'Build an auth store and a route guard',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'buy-borrow-or-build', title: 'Buy, borrow, or build in 2026', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'guard-plan',
      title: 'Plan route guards, and check that a server plan is enough',
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
