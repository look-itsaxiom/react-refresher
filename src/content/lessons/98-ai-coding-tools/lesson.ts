import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-from-autocomplete-to-agents.md?raw';
import promptA from './02-agent-loop/prompt.md?raw';
import starterA from './02-agent-loop/starter.tsx?raw';
import solutionA from './02-agent-loop/solution.tsx?raw';
import hintsA from './02-agent-loop/hints.md?raw';
import { checks as checksA } from './02-agent-loop/checks';
import concept2 from './03-help-hurt-control.md?raw';
import promptB from './04-triage-and-review/prompt.md?raw';
import starterB from './04-triage-and-review/starter.tsx?raw';
import solutionB from './04-triage-and-review/solution.tsx?raw';
import hintsB from './04-triage-and-review/hints.md?raw';
import { checks as checksB } from './04-triage-and-review/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '98-ai-coding-tools',
  track: 'ai-assisted',
  title: 'AI coding tools and agents',
  summary: 'Claude Code, Cursor, Copilot; agentic workflows, and where they help or hurt.',
  steps: [
    { kind: 'concept', id: 'from-autocomplete-to-agents', title: 'From autocomplete to agents', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'agent-loop',
      title: 'Build an agent loop simulator',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    { kind: 'concept', id: 'help-hurt-control', title: 'Where they help, where they hurt, and how to stay in control', markdown: concept2 },
    {
      kind: 'exercise',
      id: 'triage-and-review',
      title: 'Build a task triager and a review checklist',
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
