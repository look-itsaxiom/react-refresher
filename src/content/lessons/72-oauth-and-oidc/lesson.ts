import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-the-flows-that-survived.md?raw';
import promptA from './02-pkce-and-authorize-url/prompt.md?raw';
import starterA from './02-pkce-and-authorize-url/starter.tsx?raw';
import solutionA from './02-pkce-and-authorize-url/solution.tsx?raw';
import hintsA from './02-pkce-and-authorize-url/hints.md?raw';
import { checks as checksA } from './02-pkce-and-authorize-url/checks';
import concept2 from './03-oidc-and-common-mistakes.md?raw';
import promptB from './04-validate-id-token-and-redirect-uri/prompt.md?raw';
import starterB from './04-validate-id-token-and-redirect-uri/starter.tsx?raw';
import solutionB from './04-validate-id-token-and-redirect-uri/solution.tsx?raw';
import hintsB from './04-validate-id-token-and-redirect-uri/hints.md?raw';
import { checks as checksB } from './04-validate-id-token-and-redirect-uri/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '72-oauth-and-oidc',
  title: 'OAuth 2.1 and OpenID Connect',
  track: 'auth',
  summary: 'Authorization code with PKCE for SPAs, ID tokens, scopes, and common misuse.',
  steps: [
    { kind: 'concept', id: 'the-flows-that-survived', title: 'The flows that survived', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'pkce-and-authorize-url',
      title: 'PKCE, the authorize URL, and the callback',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'oidc-and-common-mistakes',
      title: 'OIDC, and the mistakes everyone makes',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'validate-id-token-and-redirect-uri',
      title: 'Validate an ID token, and check a redirect URI',
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
