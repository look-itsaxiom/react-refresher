import type { Lesson } from '../../types';
import { splitHints } from '../../lesson-helpers';
import concept1 from './01-passkeys-how-webauthn-works.md?raw';
import promptA from './02-webauthn-ceremonies/prompt.md?raw';
import starterA from './02-webauthn-ceremonies/starter.tsx?raw';
import solutionA from './02-webauthn-ceremonies/solution.tsx?raw';
import hintsA from './02-webauthn-ceremonies/hints.md?raw';
import { checks as checksA } from './02-webauthn-ceremonies/checks';
import concept2 from './03-enterprise-sso-and-mfa.md?raw';
import promptB from './04-auth-policy/prompt.md?raw';
import starterB from './04-auth-policy/starter.tsx?raw';
import solutionB from './04-auth-policy/solution.tsx?raw';
import hintsB from './04-auth-policy/hints.md?raw';
import { checks as checksB } from './04-auth-policy/checks';
import { quiz } from './05-quiz';

const lesson: Lesson = {
  id: '73-passkeys-and-sso',
  title: 'Passkeys, WebAuthn, and SSO',
  track: 'auth',
  summary: 'Passwordless login, SAML and enterprise SSO, and MFA options.',
  steps: [
    { kind: 'concept', id: 'passkeys-how-webauthn-works', title: 'Passkeys: how WebAuthn actually works', markdown: concept1 },
    {
      kind: 'exercise',
      id: 'webauthn-ceremonies',
      title: 'Build the relying-party side of a WebAuthn ceremony',
      prompt: promptA,
      files: { 'App.tsx': starterA },
      solution: { 'App.tsx': solutionA },
      hints: splitHints(hintsA),
      checks: checksA,
    },
    {
      kind: 'concept',
      id: 'enterprise-sso-and-mfa',
      title: 'Enterprise SSO and MFA in 2026',
      markdown: concept2,
    },
    {
      kind: 'exercise',
      id: 'auth-policy',
      title: 'Implement a step-up authentication policy decision',
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
