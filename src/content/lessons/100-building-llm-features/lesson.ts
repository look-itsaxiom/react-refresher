import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-shape-of-llm-feature.md?raw';
import promptA from './02-chat-stream/prompt.md?raw';
import starterA from './02-chat-stream/starter.tsx?raw';
import solutionA from './02-chat-stream/solution.tsx?raw';
import hintsA from './02-chat-stream/hints.md?raw';
import { checks as checksA } from './02-chat-stream/checks';
import concept2 from './03-structure-cost-safety.md?raw';
import promptB from './04-structured-output/prompt.md?raw';
import starterB from './04-structured-output/starter.tsx?raw';
import solutionB from './04-structured-output/solution.tsx?raw';
import hintsB from './04-structured-output/hints.md?raw';
import { checks as checksB } from './04-structured-output/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '100-building-llm-features',
  title: 'Building LLM features in a frontend',
  track: 'ai-assisted',
  summary: 'Streaming UIs, tool use, structured outputs, cost and latency, and safety basics.',
  steps: [
    { kind: 'concept', id: 'shape-of-llm-feature', title: 'The shape of an LLM feature in a React app', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'chat-stream',
      title: 'Parse an SSE stream and drive a chat UI from it',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'structure-cost-safety', title: 'Structure, cost, and safety', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'structured-output',
      title: 'Validate structured output, budget a call, and sanitize what you render',
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
